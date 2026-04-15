const express = require('express');
const router = express.Router();
require('dotenv').config();

router.get('/', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  });
});

module.exports = router;

