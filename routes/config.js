const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * GET /api/config
 *
 * Returns the Supabase Project URL and anon (public) key.
 * The anon key is intentionally public — it is scoped by Row-Level-Security
 * policies in Supabase and cannot perform privileged operations.
 *
 * ⚠️  The SERVICE ROLE KEY is NEVER exposed here.
 * Rate-limiting is applied by server.js (configLimiter).
 */
router.get("/", (req, res) => {
  // Prevent any intermediate caching of this response
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    // Log the specific missing variable server-side but never expose it to the client
    if (!url) console.error("CONFIG: SUPABASE_URL is missing from environment.");
    if (!key) console.error("CONFIG: SUPABASE_ANON_KEY is missing from environment.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // Only expose the anon key — never the service role key
  return res.json({ url, key });
});

module.exports = router;
