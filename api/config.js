const { getSupabase } = require('./lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  try {
    const supabase = getSupabase();
    const [actors, theatres, options, thresholds, scenarios, locations] = await Promise.all([
      supabase.from('config_actors').select('*').eq('conflict_id', conflictId).eq('is_active', true).order('id'),
      supabase.from('config_theatres').select('*').eq('conflict_id', conflictId).order('id'),
      supabase.from('config_options').select('*').eq('conflict_id', conflictId).eq('is_active', true).order('intensity'),
      supabase.from('config_thresholds').select('*').eq('conflict_id', conflictId).eq('is_active', true).order('id'),
      supabase.from('config_scenarios').select('*').eq('conflict_id', conflictId).eq('is_active', true).order('id'),
      supabase.from('config_locations').select('*').eq('conflict_id', conflictId).eq('is_active', true).order('id'),
    ]);
    const err = actors.error || theatres.error || options.error || thresholds.error || scenarios.error || locations.error;
    if (err) throw err;
    const thresholdIds = (thresholds.data || []).map((t) => t.id);
    const thresholdConditions = thresholdIds.length
      ? await supabase
          .from('config_threshold_conditions')
          .select('*')
          .in('threshold_id', thresholdIds)
          .order('display_order')
      : { data: [] };
    return res.status(200).json({
      actors: actors.data || [],
      theatres: theatres.data || [],
      options: options.data || [],
      thresholds: thresholds.data || [],
      scenarios: scenarios.data || [],
      threshold_conditions: thresholdConditions.data || [],
      locations: locations.data || [],
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
