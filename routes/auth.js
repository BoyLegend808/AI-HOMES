const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const {
  isEmailConfigured,
  verifyEmailTransport,
  sendMail,
  mapSendError,
} = require("../utils/mail");

const {
  sanitizeEmail,
  isValidEmail,
  isValidToken,
  validatePassword,
} = require("../middleware/security");

const IS_PROD = process.env.NODE_ENV === "production";

// ─── Safe startup check (no key values logged) ───────────────────────────────
console.log("AUTH SERVICE INIT:");
console.log("  EMAIL_USER:", process.env.EMAIL_USER ? "SET" : "MISSING");
console.log("  EMAIL_PASS:", process.env.EMAIL_PASS ? "SET" : "MISSING");
console.log("  SMTP_HOST:", process.env.SMTP_HOST ? "SET" : "default (smtp.gmail.com)");
console.log("  SUPABASE_URL:", process.env.SUPABASE_URL ? "SET" : "MISSING");
console.log("  SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "SET" : "MISSING");
console.log("  SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");

// ─── Supabase client factory (lazy, no caching of bad state) ─────────────────
const getSupabase = () => {
  const url  = process.env.SUPABASE_URL?.trim();
  const anon = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) { console.error("CRITICAL: Supabase anon credentials missing."); return null; }
  return createClient(url, anon);
};

const getSupabaseAdmin = () => {
  const url     = process.env.SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) { console.error("CRITICAL: Supabase service credentials missing."); return null; }
  return createClient(url, service);
};

// Cache clients (env vars don't change at runtime)
const supabase      = getSupabase();
const supabaseAdmin = getSupabaseAdmin();

if (!isEmailConfigured()) {
  console.warn("EMAIL credentials missing — password reset emails disabled.");
} else {
  verifyEmailTransport().then((v) => {
    if (v.ok) console.log("  EMAIL_SMTP: verified OK");
    else console.error("  EMAIL_SMTP:", v.reason);
  });
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;

    if (!activeAdmin) {
      return res.status(500).json({ error: "Database service unavailable." });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({
        error:
          "Password reset email is not configured. Please contact support or try again later.",
      });
    }

    const emailCheck = await verifyEmailTransport();
    if (!emailCheck.ok) {
      console.error("EMAIL_SMTP verify failed:", emailCheck.reason);
      return res.status(503).json({
        error:
          "Password reset email is temporarily unavailable. Please try again later or contact support.",
      });
    }

    // ── Input validation & sanitization ──────────────────────────────────────
    const rawEmail = req.body?.email;
    const email    = sanitizeEmail(rawEmail);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    // ── Lookup profile ────────────────────────────────────────────────────────
    const { data: profileUser, error: queryError } = await activeAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (queryError) {
      console.warn("Profile lookup warning:", queryError.message);
    }

    let userId    = profileUser?.id   || null;
    let userEmail = profileUser?.email || email;

    // Fallback: search Supabase Auth (capped at 5 pages for safety)
    if (!userId) {
      const perPage = 200;
      for (let page = 1; page <= 5 && !userId; page++) {
        const { data: usersPage, error: usersError } =
          await activeAdmin.auth.admin.listUsers({ page, perPage });

        if (usersError) {
          console.error("Auth user lookup error:", usersError.message);
          break;
        }
        const users    = usersPage?.users || [];
        const authUser = users.find((u) => u.email?.toLowerCase().trim() === email);
        if (authUser) { userId = authUser.id; userEmail = authUser.email || email; }
        if (users.length < perPage) break;
      }
    }

    // Always respond identically — never reveal whether an email exists
    if (!userId) {
      return res.json({
        success: true,
        message: "If this email is registered, you'll receive a reset link shortly.",
      });
    }

    // Sync email into profile row for future fast lookups
    await activeAdmin
      .from("profiles")
      .upsert({ id: userId, email: userEmail }, { onConflict: "id" });

    // Generate cryptographically secure token
    const token  = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    const { error: updateError } = await activeAdmin
      .from("profiles")
      .update({ resettoken: token, resetexpiry: expiry })
      .eq("id", userId);

    if (updateError) {
      console.error("Token store error:", updateError.message);
      return res.status(500).json({ error: "Failed to generate reset token." });
    }

    // Build reset link from trusted env var only
    const baseUrl   = process.env.CLIENT_URL || "https://ai-homes.vercel.app";
    const resetLink = `${baseUrl}/reset-password/reset-password.html?token=${token}`;

    const resetText = [
      "Password Reset Request",
      "",
      "We received a request to reset your AI HOMES password.",
      "Open this link within 1 hour:",
      resetLink,
      "",
      "If you did not request this, ignore this email.",
    ].join("\n");

    await sendMail({
      to: userEmail,
      subject: "Reset Your AI HOMES Password",
      text: resetText,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .email-container { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .header { background: #0F172A; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; color: #1e293b; line-height: 1.6; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .button { display: inline-block; padding: 14px 32px; background: #F97316; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 30px 0; }
            .logo-img { max-height: 50px; width: auto; }
            h1 { margin: 0; font-size: 24px; font-weight: 800; color: #1e293b; }
            .expiry-note { font-size: 13px; color: #94a3b8; font-style: italic; margin-top: 20px; }
          </style>
        </head>
        <body style="background:#f1f5f9; padding:20px; margin:0;">
          <div class="email-container">
            <div class="header">
              <img src="https://ai-homes.vercel.app/assets/logo.png" alt="AI HOMES" class="logo-img">
            </div>
            <div class="content">
              <h1>Password Reset Request</h1>
              <p style="margin-top:20px;">Hello,</p>
              <p>We received a request to reset the password for your AI HOMES account. Click the button below to set a new password:</p>
              <div style="text-align:center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break:break-all; font-size:12px; color:#F97316;">${resetLink}</p>
              <p class="expiry-note">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 AI HOMES Nigeria Limited. All Rights Reserved.</p>
              <div style="margin-top:10px;">
                <a href="https://ai-homes.vercel.app" style="color:#F97316; text-decoration:none; margin:0 10px;">Website</a>
                <a href="https://ai-homes.vercel.app/contact/contact.html" style="color:#F97316; text-decoration:none; margin:0 10px;">Support</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Reset email dispatched for user:", userId.slice(0, 8) + "...");

    return res.json({
      success: true,
      message: "If this email is registered, you'll receive a reset link shortly.",
    });
  } catch (err) {
    const mapped = mapSendError(err);
    console.error(
      "FORGOT-PASSWORD ERROR:",
      IS_PROD ? mapped.code : mapped.message,
    );
    if (err.code === "NOT_CONFIGURED" || err.code === "EAUTH") {
      return res.status(503).json({
        error:
          "Password reset email is temporarily unavailable. Please try again later or contact support.",
      });
    }
    return res.status(500).json({ error: "An internal error occurred. Please try again." });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    if (!activeAdmin) {
      return res.status(500).json({ error: "Database service unavailable." });
    }

    const { token, newPassword } = req.body || {};

    // ── Validate token format before hitting DB ──────────────────────────────
    if (!token || !isValidToken(token)) {
      return res.status(400).json({ error: "Invalid or missing reset token." });
    }

    // ── Validate password strength ────────────────────────────────────────────
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.reason });
    }

    // ── Lookup token ──────────────────────────────────────────────────────────
    const { data: user, error } = await activeAdmin
      .from("profiles")
      .select("id, resettoken, resetexpiry")
      .eq("resettoken", token)
      .gt("resetexpiry", Date.now())
      .single();

    if (error || !user) {
      return res.status(400).json({ error: "Token is invalid or has expired." });
    }

    // ── Update password in Supabase Auth ──────────────────────────────────────
    const { error: updateError } = await activeAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError.message);
      return res.status(500).json({ error: "Failed to update password." });
    }

    // ── Invalidate token immediately after use ────────────────────────────────
    await activeAdmin
      .from("profiles")
      .update({ resettoken: null, resetexpiry: null, updatedat: new Date().toISOString() })
      .eq("id", user.id);

    console.log("Password reset successful for user:", user.id.slice(0, 8) + "...");
    return res.json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("RESET-PASSWORD ERROR:", IS_PROD ? err.code || "INTERNAL" : err);
    return res.status(500).json({ error: "An internal error occurred. Please try again." });
  }
});

// ─── POST /api/auth/verify-reset-token ───────────────────────────────────────
router.post("/verify-reset-token", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    if (!activeAdmin) {
      return res.status(500).json({ error: "Database service unavailable." });
    }

    const { token } = req.body || {};

    // Validate token format before DB round-trip
    if (!token || !isValidToken(token)) {
      return res.status(400).json({ success: false, error: "Invalid or missing token." });
    }

    const { data: user, error } = await activeAdmin
      .from("profiles")
      .select("id")           // ← ONLY select id — never return email to client
      .eq("resettoken", token)
      .gt("resetexpiry", Date.now())
      .single();

    if (error || !user) {
      return res.status(400).json({ success: false, error: "Token is invalid or has expired." });
    }

    return res.json({ success: true, valid: true });
  } catch (err) {
    console.error("VERIFY-TOKEN ERROR:", IS_PROD ? err.code || "INTERNAL" : err);
    return res.status(500).json({ error: "An internal error occurred. Please try again." });
  }
});

module.exports = router;
