const express = require('express');
const router = express.Router();
const path = require('path');
// Ensure dotenv is loaded with absolute path for reliability
require('dotenv').config({ path: path.join(__dirname, '../.env') });

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    console.error("CONFIG ERROR: Missing variables.");
    if (!url) console.error("- SUPABASE_URL is missing");
    if (!key) console.error("- SUPABASE_ANON_KEY is missing");
    
    return res.status(500).json({ 
      error: "Server configuration missing",
      details: `Missing: ${!url ? 'SUPABASE_URL ' : ''}${!key ? 'SUPABASE_ANON_KEY' : ''}`
    });
  }

  res.json({
    url: url,
    key: key
  });
});

module.exports = router;

