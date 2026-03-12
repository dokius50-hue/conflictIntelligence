/**
 * Query tool: config_thresholds and config_threshold_conditions. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getThresholdsForTheatres(theatreIds, conflictId = null, activeOnly = true) {
  if (!Array.isArray(theatreIds) || theatreIds.length === 0) return [];
  const supabase = getSupabase();
  let q = supabase.from('config_thresholds').select('*').in('theatre_id', theatreIds);
  if (conflictId) q = q.eq('conflict_id', conflictId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('id');
  if (error) throw error;
  return data || [];
}

async function getThresholdConditions(thresholdIds) {
  if (!Array.isArray(thresholdIds) || thresholdIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('config_threshold_conditions')
    .select('*')
    .in('threshold_id', thresholdIds)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

async function getThresholdsWithConditions(theatreIds, conflictId = null) {
  const thresholds = await getThresholdsForTheatres(theatreIds, conflictId);
  const tids = thresholds.map((t) => t.id);
  const conditions = await getThresholdConditions(tids);
  return { thresholds, conditions };
}

module.exports = {
  getThresholdsForTheatres,
  getThresholdConditions,
  getThresholdsWithConditions,
};
