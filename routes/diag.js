const express = require("express");
const router = express.Router();
const path = require("path");
const { requireAdminSecret } = require("../middleware/security");

/**
 * GET /api/diag
 *
 * Internal diagnostic endpoint — GATED by X-Admin-Secret header.
 * In production, unauthorized requests receive a generic 404 so the
 * endpoint isn't discoverable by external scanners.
 *
 * Set ADMIN_SECRET in your .env (and Vercel env vars) to enable access.
 */
router.get("/", requireAdminSecret, async (req, res) => {
  require("dotenv").config({ path: path.join(__dirname, "../.env") });

  // Redact all actual values — only report presence/absence
  const info = {
    node_env: process.env.NODE_ENV || "development",
    supabase_url:     process.env.SUPABASE_URL             ? "PRESENT" : "MISSING",
    supabase_anon:    process.env.SUPABASE_ANON_KEY         ? "PRESENT" : "MISSING",
    supabase_service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "PRESENT" : "MISSING",
    email_user:       process.env.EMAIL_USER                ? "PRESENT" : "MISSING",
    email_pass:       process.env.EMAIL_PASS                ? "PRESENT" : "MISSING",
    admin_secret:     process.env.ADMIN_SECRET              ? "PRESENT" : "MISSING",
    database_check:   null,
  };

  try {
    const { createClient } = require("@supabase/supabase-js");
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const db = createClient(process.env.SUPABASE_URL, adminKey);

    const { count, error } = await db
      .from("houses")
      .select("*", { count: "exact", head: true });

    info.database_check = error
      ? `Error: ${error.message}`
      : `OK — ${count} house record(s) found`;
  } catch (e) {
    info.database_check = `Crash: ${e.message}`;
  }

  return res.json(info);
});

module.exports = router;
