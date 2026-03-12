/**
 * Pure reasoning: option space. No DB, no side effects.
 * Returns the residual option space for an actor: options that are available but not yet
 * executed or foreclosed, with prerequisite status computed and locked options flagged,
 * ordered by escalation intensity.
 */
function getResidualOptionSpace(actorId, allOptions, events) {
  const options = (allOptions || []).filter((o) => o.actor_id === actorId && o.status !== 'foreclosed');
  const executedIds = new Set();
  const foreclosedIds = new Set();
  (events || []).forEach((e) => {
    (e.options_executed || []).forEach((id) => executedIds.add(id));
    (e.options_foreclosed || []).forEach((id) => foreclosedIds.add(id));
  });
  const optionById = new Map(options.map((o) => [o.id, o]));

  const withStatus = options.map((opt) => {
    const isExecuted = executedIds.has(opt.id) || opt.status === 'executed';
    const isForeclosed = foreclosedIds.has(opt.id) || opt.status === 'foreclosed';
    const prerequisites = opt.prerequisites || [];
    const allPrereqMet = prerequisites.every((pid) => executedIds.has(pid) || (optionById.get(pid) && optionById.get(pid).status === 'executed'));
    const effectiveStatus = isExecuted
      ? 'executed'
      : isForeclosed
        ? 'foreclosed'
        : !allPrereqMet
          ? 'locked'
          : opt.status === 'degraded'
            ? 'degraded'
            : 'available';
    return { ...opt, effectiveStatus, prerequisitesMet: allPrereqMet };
  });

  return withStatus
    .filter((o) => o.effectiveStatus !== 'foreclosed' && o.effectiveStatus !== 'executed')
    .sort((a, b) => (a.intensity ?? 0) - (b.intensity ?? 0));
}

/**
 * Returns what changed in the option space as a result of a specific event.
 * Used for causal chain: click event → see cross-actor option effects.
 */
function getOptionChangesFromEvent(eventId, allOptions, events) {
  const event = (events || []).find((e) => e.id === eventId);
  if (!event) return { executed: [], degraded: [], foreclosed: [], unlocked: [] };
  const optionById = new Map((allOptions || []).map((o) => [o.id, o]));
  return {
    executed: (event.options_executed || []).map((id) => optionById.get(id)).filter(Boolean),
    degraded: (event.options_degraded || []).map((id) => optionById.get(id)).filter(Boolean),
    foreclosed: (event.options_foreclosed || []).map((id) => optionById.get(id)).filter(Boolean),
    unlocked: (event.options_unlocked || []).map((id) => optionById.get(id)).filter(Boolean),
  };
}

module.exports = {
  getResidualOptionSpace,
  getOptionChangesFromEvent,
};
