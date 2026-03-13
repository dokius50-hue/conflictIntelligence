const { getSupabase } = require('./lib/supabase');
const { getCausalChain } = require('../lib/reasoning/causal-chain');
const { getThresholdsWithConditions } = require('../lib/db/thresholds');
const { getScenariosForConflict } = require('../lib/db/scenarios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { event_id, conflict_id } = req.query;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });
  const conflictId = conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  try {
    const supabase = getSupabase();

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .eq('status', 'published')
      .single();
    if (eventErr || !event) return res.status(404).json({ error: 'Event not found' });

    const [{ data: allOptions }, { data: theatres }, allScenarios] = await Promise.all([
      supabase.from('config_options').select('*').eq('conflict_id', conflictId),
      supabase.from('config_theatres').select('id').eq('conflict_id', conflictId),
      getScenariosForConflict(conflictId),
    ]);

    const theatreIds = (theatres || []).map((t) => t.id);
    const { thresholds: allThresholds, conditions: allConditions } =
      await getThresholdsWithConditions(theatreIds, conflictId);

    const chain = getCausalChain(event, allOptions || [], allConditions, allThresholds, allScenarios);

    // Annotate each advanced threshold with its progress (satisfied / total conditions).
    const conditionsByThreshold = {};
    (allConditions || []).forEach((c) => {
      if (!conditionsByThreshold[c.threshold_id]) conditionsByThreshold[c.threshold_id] = [];
      conditionsByThreshold[c.threshold_id].push(c);
    });

    const thresholdsAnnotated = chain.thresholdsAdvanced.map((t) => {
      const conds = conditionsByThreshold[t.id] || [];
      const satisfied = conds.filter((c) => c.status === 'satisfied').length;
      return { ...t, conditionsTotal: conds.length, conditionsSatisfied: satisfied };
    });

    return res.status(200).json({
      event: chain.event,
      optionChanges: chain.optionChanges,
      thresholdsAdvanced: thresholdsAnnotated,
      scenariosAtRisk: chain.scenariosAtRisk,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
