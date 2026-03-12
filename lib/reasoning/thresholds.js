/**
 * Pure reasoning: threshold proximity. No DB, no side effects.
 * Returns threshold proximity: conditions met/unmet, proximity ratio, and the next unmet
 * condition to watch (lowest display_order among unmet).
 */
function getThresholdProximity(threshold, conditions, recentEvents) {
  const conds = (conditions || []).filter((c) => c.threshold_id === threshold.id).sort((a, b) => a.display_order - b.display_order);
  const met = conds.filter((c) => c.status === 'met');
  const unmet = conds.filter((c) => c.status !== 'met' && c.status !== 'no_longer_applicable');
  const ratio = conds.length ? met.length / conds.length : 0;
  const nextUnmet = unmet[0] || null;
  return {
    threshold,
    conditions: conds,
    metCount: met.length,
    totalCount: conds.length,
    proximityRatio: ratio,
    nextUnmet,
  };
}

/**
 * Returns all thresholds that a given event advances (via thresholds_advanced condition IDs).
 */
function getThresholdsAdvancedByEvent(eventId, conditions, events) {
  const event = (events || []).find((e) => e.id === eventId);
  if (!event || !event.thresholds_advanced?.length) return [];
  const advancedIds = new Set(event.thresholds_advanced);
  const conds = (conditions || []).filter((c) => advancedIds.has(c.id));
  const thresholdIds = [...new Set(conds.map((c) => c.threshold_id))];
  return thresholdIds;
}

module.exports = {
  getThresholdProximity,
  getThresholdsAdvancedByEvent,
};
