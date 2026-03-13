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
  const { queue_id, reviewer_notes } = body;
  if (!queue_id) return res.status(400).json({ error: 'queue_id required' });
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('events_queue')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewer_notes ?? null,
      })
      .eq('id', queue_id)
      .eq('status', 'pending');
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
