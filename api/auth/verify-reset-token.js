import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error("Missing Supabase configuration");
      return res.status(500).json({ error: "Server configuration error" });
    }

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
}
