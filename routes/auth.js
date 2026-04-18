const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log("------------------------------------------");
console.log("AUTH SERVICE INITIALIZATION:");
console.log("- EMAIL_USER:", process.env.EMAIL_USER || "MISSING");
console.log("- SUPABASE_URL:", process.env.SUPABASE_URL ? "SET (ends with " + process.env.SUPABASE_URL.slice(-5) + ")" : "MISSING");
console.log("- SUPABASE_ANON:", process.env.SUPABASE_ANON_KEY ? "SET" : "MISSING");
console.log("- SUPABASE_SERVICE:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");
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
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
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
      return res.status(500).json({ error: "Database connection not initialized" });
    }
    if (!activeTransporter) {
      console.error("FORGOT-PASSWORD: Email transporter missing");
      return res.status(500).json({ error: "Email service not configured on server" });
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
          console.error("FORGOT-PASSWORD: Auth user lookup failed:", usersError.message);
          break;
        }

        const users = usersPage?.users || [];
        const authUser = users.find(
          (u) => String(u.email || "").toLowerCase().trim() === normalizedEmail,
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
      return res.json({ message: "If this email is registered, you'll get a link shortly." });
    }

    // Ensure profile row has email populated for future fast lookups.
    const { error: profileUpsertError } = await activeAdmin.from("profiles").upsert(
      { id: userId, email: userEmail },
      { onConflict: "id" },
    );
    if (profileUpsertError) {
      console.warn("FORGOT-PASSWORD: profile email sync warning:", profileUpsertError.message);
    }

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    // Store token in database using admin client (bypass RLS)
    const { error: updateError } = await activeAdmin
      .from("profiles")
      .update({ resetToken: token, resetExpiry: expiry })
      .eq("id", userId);

    if (updateError) {
      console.error("FORGOT-PASSWORD: DB UPDATE ERROR:", updateError);
      return res.status(500).json({ error: "Failed to generate reset token" });
    }

    // Send reset email
    const clientUrl = process.env.CLIENT_URL || req.headers.origin || "https://ai-homes.vercel.app";
    const resetLink = `${clientUrl}/reset-password/reset-password.html?token=${token}`;
    
    const mailOptions = {
      from: `"StudentHome Support" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Reset Your StudentHome Password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4CAF50;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for StudentHome. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">StudentHome Platform - Secure Student Housing</p>
        </div>
      `,
    };

    console.log("Attempting to send email via Gmail...");
    const info = await activeTransporter.sendMail(mailOptions);
    console.log("Reset email sent successfully. SMTP Response:", info.response);
    if (info.messageId) console.log("Message ID:", info.messageId);

    res.json({ message: "If this email is registered, you'll get a link shortly." });
  } catch (err) {
    console.error("FORGOT-PASSWORD CRITICAL ERROR:", err);
    res.status(500).json({ 
      error: "Internal server error occurred.",
      message: err.message,
      code: err.code || 'UNKNOWN'
    });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const activeAdmin = getSupabaseAdmin() || supabaseAdmin;
    if (!activeAdmin) {
      console.error("RESET-PASSWORD: Supabase admin client missing");
      return res.status(500).json({ error: "Database connection not initialized." });
    }

    console.log("Reset password called with token length:", req.body.token?.length);
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
      .select("id, email, resetToken, resetExpiry")
      .eq("resetToken", token)
      .gt("resetExpiry", Date.now())
      .single();

    console.log("Token validation:", !!user, error?.message);

    if (error || !user) {
      return res
        .status(400)
        .json({ error: "Token is invalid or has expired." });
    }

    // Update password in Supabase auth using admin client
    console.log("Updating password for user.id:", user.id);
    const { error: updateError } =
      await activeAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("PASSWORD UPDATE ERROR:", updateError);
      return res.status(500).json({ error: "Failed to update password." });
    }

    // Clear the reset token after successful password update
    const { error: clearTokenError } = await activeAdmin
      .from("profiles")
      .update({
        resetToken: null,
        resetExpiry: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (clearTokenError) {
      console.error("Clear token error:", clearTokenError);
      // Don't fail here - password was updated successfully
    }

    console.log("Password reset successful for:", user.email);
    res.json({
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
      return res.status(500).json({ error: "Database connection not initialized." });
    }
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    // Check if token is valid and not expired
    const { data: user, error } = await activeAdmin
      .from("profiles")
      .select("id, email")
      .eq("resetToken", token)
      .gt("resetExpiry", Date.now())
      .single();

    if (error || !user) {
      return res
        .status(400)
        .json({ error: "Token is invalid or has expired." });
    }

    res.json({ valid: true, email: user.email });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

module.exports = router;

