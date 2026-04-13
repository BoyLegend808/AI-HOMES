import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error("Missing Supabase configuration");
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing email configuration");
      return res.status(500).json({ error: "Server configuration error" });
    }

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
    const clientUrl = process.env.CLIENT_URL || "https://ai-homes.vercel.app";
    const resetLink = `${clientUrl}/reset-password/reset-password.html?token=${token}`;

    try {
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
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the request - token is still stored
      console.warn(
        "Password reset token stored but email failed to send. Token:",
        token,
      );
    }

    res.json({ message: "If this email is registered, you'll get a link." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
  }
}
