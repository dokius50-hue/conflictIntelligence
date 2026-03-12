/**
 * Supabase client for scripts. Uses service role key to write to queue tables.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(url, key);

module.exports = { supabase };
