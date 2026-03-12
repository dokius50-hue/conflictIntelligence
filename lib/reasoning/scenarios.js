/**
 * Pure reasoning: scenario viability. No DB, no side effects.
 * Condition status is 'holding' | 'violated' — never treat as boolean.
 * Returns all scenarios with viability computed from condition states. Falsified scenarios
 * include the violating condition, its event, and timestamp. Viable scenarios include
 * count of conditions still holding.
 */
function getFalsifiedScenarios(scenarios, scenarioConditions) {
  const byScenario = new Map();
  (scenarioConditions || []).forEach((c) => {
    if (!byScenario.has(c.scenario_id)) byScenario.set(c.scenario_id, []);
    byScenario.get(c.scenario_id).push(c);
  });
  return (scenarios || []).map((s) => {
    const conds = byScenario.get(s.id) || [];
    const violated = conds.filter((c) => c.status === 'violated');
    const holding = conds.filter((c) => c.status === 'holding');
    const viabilityStatus = s.viability_status === 'falsified' ? 'falsified' : violated.length > 0 ? 'falsified' : 'viable';
    const firstViolation = violated[0] || null;
    return {
      ...s,
      viabilityStatus,
      conditionsHolding: holding.length,
      conditionsTotal: conds.length,
      firstViolation,
    };
  });
}

/**
 * Returns scenario records that would be falsified if the given threshold is crossed
 * (from config_thresholds.falsifies_scenario_ids). Pass threshold object and full scenarios list.
 */
function getScenariosAtRiskFromThreshold(threshold, scenarios) {
  if (!threshold || !threshold.falsifies_scenario_ids) return [];
  const ids = new Set(threshold.falsifies_scenario_ids);
  return (scenarios || []).filter((s) => ids.has(s.id));
}

module.exports = {
  getFalsifiedScenarios,
  getScenariosAtRiskFromThreshold,
};
