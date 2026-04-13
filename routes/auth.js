const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client (anon key for regular operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// Initialize Supabase admin client (service role key for password updates)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Email sender setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email in profiles
    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    // Always send the same message for security
    if (error || !user) {
      return res.json({
        message: "If this email is registered, you'll get a link.",
      });
    }

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour

    // Store token in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ resetToken: token, resetExpiry: expiry })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({ error: "Server error" });
    }

    // Send reset email
    const resetLink = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
    await transporter.sendMail({
      from: `"StudentHome" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your StudentHome Password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    res.json({ message: "If this email is registered, you'll get a link." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate password format
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long.",
      });
    }

    // Find user with valid token
    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, email, resetToken, resetExpiry")
      .eq("resetToken", token)
      .gt("resetExpiry", Date.now())
      .single();

    if (error || !user) {
      return res
        .status(400)
        .json({ error: "Token is invalid or has expired." });
    }

    // Update password in Supabase auth using admin client
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ error: "Failed to update password." });
    }

    // Clear the reset token after successful password update
    const { error: clearTokenError } = await supabase
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

    res.json({
      message:
        "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /api/auth/verify-reset-token
// Optional endpoint to validate reset token before showing form
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    // Check if token is valid and not expired
    const { data: user, error } = await supabase
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
