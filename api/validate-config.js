const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;
  const conflictId = req.method === 'GET' ? req.query.conflict_id : (req.body && (req.body.conflict_id || (typeof req.body === 'string' ? JSON.parse(req.body || '{}').conflict_id : null))) || null;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('validate_config_references', { p_conflict_id: conflictId || null });
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
