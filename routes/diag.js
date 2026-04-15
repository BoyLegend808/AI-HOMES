const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
  // Try to load env again just in case
  require('dotenv').config({ path: path.join(__dirname, '../.env') });

  const info = {
    cwd: process.cwd(),
    dirname: __dirname,
    env_keys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('EMAIL')),
    supabase_url: process.env.SUPABASE_URL ? `Present (length ${process.env.SUPABASE_URL.length})` : 'MISSING',
    supabase_anon: process.env.SUPABASE_ANON_KEY ? 'Present' : 'MISSING',
    email_user: process.env.EMAIL_USER ? 'Present' : 'MISSING',
    database_check: null,
  };

  try {
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { count, error } = await db.from('houses').select('*', { count: 'exact', head: true });
    
    if (error) {
      info.database_check = `Error: ${error.message}`;
    } else {
      info.database_check = `Success: Found ${count} houses`;
    }
  } catch (e) {
    info.database_check = `Crash: ${e.message}`;
  }

  res.json(info);
});

module.exports = router;
