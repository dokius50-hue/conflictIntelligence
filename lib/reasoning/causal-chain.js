/**
 * Pure reasoning: full cross-theatre impact of a single event. No DB, no side effects.
 * Returns which options it changed and how, which threshold conditions it satisfied,
 * which scenarios it brought closer to falsification. Data for the causal chain panel.
 */
const { getOptionChangesFromEvent } = require('./options');

function getCausalChain(event, allOptions, allConditions, allThresholds, allScenarios) {
  if (!event) return { optionChanges: null, thresholdsAdvanced: [], scenariosAtRisk: [] };
  const optionChanges = getOptionChangesFromEvent(event.id, allOptions, [event]);
  const advancedConditionIds = new Set(event.thresholds_advanced || []);
  const conditionsSatisfied = (allConditions || []).filter((c) => advancedConditionIds.has(c.id));
  const thresholdIdsAdvanced = [...new Set(conditionsSatisfied.map((c) => c.threshold_id))];
  const thresholdsAdvanced = (allThresholds || []).filter((t) => thresholdIdsAdvanced.includes(t.id));
  const scenarioIdsAtRisk = new Set();
  thresholdsAdvanced.forEach((t) => (t.falsifies_scenario_ids || []).forEach((id) => scenarioIdsAtRisk.add(id)));
  const scenariosAtRisk = (allScenarios || []).filter((s) => scenarioIdsAtRisk.has(s.id));
  return {
    event,
    optionChanges,
    thresholdsAdvanced,
    scenariosAtRisk,
  };
}

module.exports = {
  getCausalChain,
};
