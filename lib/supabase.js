/**
 * Supabase client for lib/db and app. Use anon key for frontend; service role for backend/admin.
 */
const { createClient } = require('@supabase/supabase-js');

function getSupabase(options = {}) {
  const url = process.env.SUPABASE_URL || options.url;
  const key = options.serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error('SUPABASE_URL and key (anon or service) required');
  return createClient(url, key);
}

module.exports = { getSupabase };
