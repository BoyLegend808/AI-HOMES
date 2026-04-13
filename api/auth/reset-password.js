import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
}
