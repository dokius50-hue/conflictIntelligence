/**
 * Query tool: config_scenarios and config_scenario_conditions. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getScenariosForConflict(conflictId, activeOnly = true) {
  let q = getSupabase().from('config_scenarios').select('*').eq('conflict_id', conflictId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('id');
  if (error) throw error;
  return data || [];
}

async function getScenarioConditions(scenarioIds) {
  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('config_scenario_conditions')
    .select('*')
    .in('scenario_id', scenarioIds)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

module.exports = {
  getScenariosForConflict,
  getScenarioConditions,
};
