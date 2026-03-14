const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');
const { getAllOptionsForConflict } = require('../lib/db/options');

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
      const options = await getAllOptionsForConflict(conflictId, false);
      return res.status(200).json({ options: options || [] });
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
    const { status } = updates;
    if (!status || !['available', 'executed', 'degraded', 'foreclosed'].includes(status)) {
      return res.status(400).json({ error: 'updates.status must be available|executed|degraded|foreclosed' });
    }
    try {
      const { error: updateErr } = await supabase
        .from('config_options')
        .update({ status })
        .eq('conflict_id', conflictId)
        .eq('id', id);
      if (updateErr) throw updateErr;
      const options = await getAllOptionsForConflict(conflictId, false);
      const { data: warnings, error: valErr } = await supabase.rpc('validate_config_references', {
        p_conflict_id: conflictId,
      });
      if (valErr) {
        console.error('validate_config_references error', valErr.message);
      }
      return res.status(200).json({
        options: options || [],
        warnings: warnings || [],
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
