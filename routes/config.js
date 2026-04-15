const express = require('express');
const router = express.Router();
require('dotenv').config();

router.get('/', (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("CONFIG ERROR: SUPABASE_URL or ANON_KEY missing from ENV");
    // We still return 200/JSON so the frontend doesn't crash with SyntaxError, 
    // but the values will be null/undefined which signals the issue.
  }
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  });
});

module.exports = router;

