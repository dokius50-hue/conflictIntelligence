const { getThresholdsWithConditions } = require('../lib/db/thresholds');
const { getThresholdProximity } = require('../lib/reasoning/thresholds');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  try {
    // Fetch all theatres for this conflict to get all thresholds
    const { getSupabase } = require('./lib/supabase');
    const { data: theatres } = await getSupabase()
      .from('config_theatres')
      .select('id')
      .eq('conflict_id', conflictId);

    const theatreIds = (theatres || []).map((t) => t.id);
    if (!theatreIds.length) return res.status(200).json([]);

    const { thresholds, conditions } = await getThresholdsWithConditions(theatreIds, conflictId);

    const withProximity = thresholds.map((t) =>
      getThresholdProximity(t, conditions, [])
    );

    return res.status(200).json(withProximity);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
