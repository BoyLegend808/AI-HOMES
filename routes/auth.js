const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log("------------------------------------------");
console.log("AUTH SERVICE INITIALIZATION:");
console.log("- EMAIL_USER:", process.env.EMAIL_USER || "MISSING");
console.log(
  "- SUPABASE_URL:",
  process.env.SUPABASE_URL
    ? "SET (ends with " + process.env.SUPABASE_URL.slice(-5) + ")"
    : "MISSING",
);
console.log(
  "- SUPABASE_ANON:",
  process.env.SUPABASE_ANON_KEY ? "SET" : "MISSING",
);
console.log(
  "- SUPABASE_SERVICE:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
);
console.log("------------------------------------------");

// Initialize Supabase client safely
const getSupabase = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const anon = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY is missing.");
    return null;
  }
  return createClient(url, anon);
};

// Initialize Supabase admin client safely
const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) {
    console.error(
      "CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return null;
  }
  return createClient(url, service);
};

const supabase = getSupabase();
const supabaseAdmin = getSupabaseAdmin();

// Email sender setup safely
let transporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    /* 
    transporter.verify((error) => {
      if (error) console.error("Email transporter ERROR:", error);
      else console.log("Email transporter ready");
    });
    */
  } else {
    console.warn("EMAIL_USER or EMAIL_PASS missing. Email features will fail.");
  }
} catch (e) {
  console.error("Failed to initialize email transporter:", e);
}

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    // Re-verify client initialization on each request to be safe
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    const activeTransporter = transporter;

    if (!activeAdmin) {
      console.error("FORGOT-PASSWORD: Supabase admin client missing");
      return res
        .status(500)
        .json({ error: "Database connection not initialized" });
    }
    if (!activeTransporter) {
      console.error("FORGOT-PASSWORD: Email transporter missing");
      return res
        .status(500)
        .json({ error: "Email service not configured on server" });
    }

    const { email } = req.body;
    console.log("Forgot password request for:", email);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // First try lookup in profiles by email.
    const { data: profileUser, error: queryError } = await activeAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (queryError) {
      console.warn("Profile lookup error:", queryError.message);
    }

    let userId = profileUser?.id || null;
    let userEmail = profileUser?.email || normalizedEmail;

    // Fallback: find user in Supabase Auth (covers accounts where profiles.email is empty/missing).
    if (!userId) {
      let page = 1;
      const perPage = 200;

      while (page <= 10 && !userId) {
        const { data: usersPage, error: usersError } =
          await activeAdmin.auth.admin.listUsers({ page, perPage });

        if (usersError) {
          console.error(
            "FORGOT-PASSWORD: Auth user lookup failed:",
            usersError.message,
          );
          break;
        }

        const users = usersPage?.users || [];
        const authUser = users.find(
          (u) =>
            String(u.email || "")
              .toLowerCase()
              .trim() === normalizedEmail,
        );

        if (authUser) {
          userId = authUser.id;
          userEmail = authUser.email || normalizedEmail;
          break;
        }

        if (users.length < perPage) break;
        page += 1;
      }
    }

    if (!userId) {
      console.log("FORGOT-PASSWORD: No user found for email:", normalizedEmail);
      return res.json({
        success: true,
        message: "If this email is registered, you'll get a link shortly.",
      });
    }

    // Ensure profile row has email populated for future fast lookups.
    const { error: profileUpsertError } = await activeAdmin
      .from("profiles")
      .upsert({ id: userId, email: userEmail }, { onConflict: "id" });
    if (profileUpsertError) {
      console.warn(
        "FORGOT-PASSWORD: profile email sync warning:",
        profileUpsertError.message,
      );
    }

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    // Store token in database using admin client (bypass RLS)
    const { error: updateError } = await activeAdmin
      .from("profiles")
      .update({ resettoken: token, resetexpiry: expiry })
      .eq("id", userId);

    if (updateError) {
      console.error("FORGOT-PASSWORD: DB UPDATE ERROR:", updateError);
      return res.status(500).json({ error: "Failed to generate reset token" });
    }

    // Send reset email
    const clientUrl =
      process.env.CLIENT_URL ||
      req.headers.origin ||
      "https://ai-homes.vercel.app";
    const resetLink = `${clientUrl}/reset-password/reset-password.html?token=${token}`;

    const mailOptions = {
      from: `"StudentHome Support" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Reset Your StudentHome Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .email-container {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              border: 1px solid #e2e8f0;
            }
            .header {
              background-color: #0F172A;
              padding: 40px 20px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
              color: #1e293b;
              line-height: 1.6;
            }
            .footer {
              background-color: #f8fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background-color: #F97316;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 700;
              font-size: 16px;
              margin: 30px 0;
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
            }
            .logo-img {
              max-height: 50px;
              width: auto;
            }
            h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
            }
            .expiry-note {
              font-size: 13px;
              color: #94a3b8;
              font-style: italic;
              margin-top: 20px;
            }
          </style>
        </head>
        <body style="background-color: #f1f5f9; padding: 20px; margin: 0;">
          <div class="email-container">
            <div class="header">
              <img src="https://ai-homes.vercel.app/assets/logo.png" alt="StudentHome" class="logo-img">
            </div>
            <div class="content">
              <h1>Password Reset Request</h1>
              <p style="margin-top: 20px;">Hello,</p>
              <p>We received a request to reset the password for your StudentHome account. Click the button below to set a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #F97316;">${resetLink}</p>
              
              <p class="expiry-note">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 StudentHome Nigeria Limited. All Rights Reserved.</p>
              <p>Secure Student Housing Platform</p>
              <div style="margin-top: 10px;">
                <a href="https://ai-homes.vercel.app" style="color: #F97316; text-decoration: none; margin: 0 10px;">Website</a>
                <a href="https://ai-homes.vercel.app/contact/contact.html" style="color: #F97316; text-decoration: none; margin: 0 10px;">Support</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log("Attempting to send email via Gmail...");
    const info = await activeTransporter.sendMail(mailOptions);
    console.log("Reset email sent successfully. SMTP Response:", info.response);

    res.json({
      success: true,
      message: "If this email is registered, you'll get a link shortly.",
    });
  } catch (err) {
    console.error("FORGOT-PASSWORD CRITICAL ERROR:", err);
    res.status(500).json({
      error: "Internal server error occurred.",
      message: err.message,
      code: err.code || "UNKNOWN",
    });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    if (!activeAdmin) {
      console.error("RESET-PASSWORD: Supabase admin client missing");
      return res
        .status(500)
        .json({ error: "Database connection not initialized." });
    }

    console.log(
      "Reset password called with token length:",
      req.body.token?.length,
    );
    const { token, newPassword } = req.body;

    // Validate password format
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long.",
      });
    }

    // Find user with valid token using admin client (bypass RLS)
    const { data: user, error } = await activeAdmin
      .from("profiles")
      .select("id, email, resettoken, resetexpiry")
      .eq("resettoken", token)
      .gt("resetexpiry", Date.now())
      .single();

    console.log("Token validation:", !!user, error?.message);

    if (error || !user) {
      return res
        .status(400)
        .json({ error: "Token is invalid or has expired." });
    }

    // Update password in Supabase auth using admin client
    console.log("Updating password for user.id:", user.id);
    const { error: updateError } = await activeAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      },
    );

    if (updateError) {
      console.error("PASSWORD UPDATE ERROR:", updateError);
      return res.status(500).json({ error: "Failed to update password." });
    }

    // Clear the reset token after successful password update
    const { error: clearTokenError } = await activeAdmin
      .from("profiles")
      .update({
        resettoken: null,
        resetexpiry: null,
        updatedat: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (clearTokenError) {
      console.error("Clear token error:", clearTokenError);
      // Don't fail here - password was updated successfully
    }

    console.log("Password reset successful for:", user.email);
    res.json({
      success: true,
      message:
        "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("RESET-PASSWORD FULL ERROR:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /api/auth/verify-reset-token
// Optional endpoint to validate reset token before showing form
router.post("/verify-reset-token", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    if (!activeAdmin) {
      console.error("VERIFY-TOKEN: Supabase admin client missing");
      return res
        .status(500)
        .json({ error: "Database connection not initialized." });
    }
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    // Check if token is valid and not expired
    const { data: user, error } = await activeAdmin
      .from("profiles")
      .select("id, email")
      .eq("resettoken", token)
      .gt("resetexpiry", Date.now())
      .single();

    if (error || !user) {
      return res
        .status(400)
        .json({ success: false, error: "Token is invalid or has expired." });
    }

    res.json({ success: true, valid: true, email: user.email });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

module.exports = router;
