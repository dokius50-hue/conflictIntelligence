const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;

  const supabase = getSupabase();
  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('config_theatres')
        .select('*')
        .eq('conflict_id', conflictId)
        .order('id');
      if (error) throw error;
      return res.status(200).json({ theatres: data || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const { id, updates } = body;
    if (!id || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'id and updates required' });
    }
    try {
      const { error: updateErr } = await supabase
        .from('config_theatres')
        .update(updates)
        .eq('conflict_id', conflictId)
        .eq('id', id);
      if (updateErr) throw updateErr;
      const { data: theatres, error: fetchErr } = await supabase
        .from('config_theatres')
        .select('*')
        .eq('conflict_id', conflictId)
        .order('id');
      if (fetchErr) throw fetchErr;
      const { data: warnings, error: valErr } = await supabase.rpc('validate_config_references', {
        p_conflict_id: conflictId,
      });
      if (valErr) {
        console.error('validate_config_references error', valErr.message);
      }
      return res.status(200).json({
        theatres: theatres || [],
        warnings: warnings || [],
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

