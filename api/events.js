const { getSupabase } = require('./lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const supabase = getSupabase();
    let q = supabase.from('events').select('*').eq('conflict_id', conflictId).eq('status', 'published').order('reported_at', { ascending: false }).limit(limit);
    if (req.query.theatres) {
      const theatres = req.query.theatres.split(',').map((t) => t.trim()).filter(Boolean);
      if (theatres.length) q = q.overlaps('theatres', theatres);
    }
    if (req.query.location_id) {
      q = q.eq('location_id', req.query.location_id.trim());
    }
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
