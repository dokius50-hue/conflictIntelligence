const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const conflictId = body.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('config_conflicts')
      .update({ last_reviewed_at: now })
      .eq('id', conflictId);
    if (error) throw error;
    return res.status(200).json({ ok: true, last_reviewed_at: now });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
