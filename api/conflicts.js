const { getSupabase } = require('./lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { data, error } = await getSupabase()
      .from('config_conflicts')
      .select('id, name, short_name')
      .eq('status', 'active')
      .order('id');
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
