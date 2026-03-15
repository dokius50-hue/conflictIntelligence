/**
 * Synthesis agent. Merges outputs from option-analyst, threshold-analyst, and
 * cross-theatre into a single validated tag set. Strips hallucinated IDs.
 * Pure function — no LLM calls, no DB calls.
 */

/**
 * Merge and validate all sub-agent outputs.
 * @param {object} optionResult - from option-analyst
 * @param {object} thresholdResult - from threshold-analyst
 * @param {object} crossTheatreResult - from cross-theatre
 * @param {Set<string>} validOptionIds - from config
 * @param {Set<string>} validConditionIds - from config
 * @returns {object} final tag suggestions with only valid IDs
 */
function synthesise(optionResult, thresholdResult, crossTheatreResult, validOptionIds, validConditionIds) {
  const opt = optionResult.suggestions || {};
  const thr = thresholdResult.suggestions || {};
  const cross = crossTheatreResult.suggestions || {};

  const mergedExecuted = dedup([...(opt.options_executed || []), ...(cross.options_affected || []).filter((id) => (opt.options_executed || []).includes(id))]);
  const mergedDegraded = dedup([...(opt.options_degraded || [])]);
  const mergedForeclosed = dedup([...(opt.options_foreclosed || [])]);
  const mergedUnlocked = dedup([...(opt.options_unlocked || [])]);

  // Cross-theatre can add option impacts that option-analyst missed (different theatre focus)
  for (const id of (cross.options_affected || [])) {
    if (!mergedExecuted.includes(id) && !mergedDegraded.includes(id) && !mergedForeclosed.includes(id) && !mergedUnlocked.includes(id)) {
      mergedDegraded.push(id);
    }
  }

  const mergedThresholds = dedup([...(thr.thresholds_advanced || []), ...(cross.conditions_affected || [])]);

  // Strip hallucinated IDs
  const validated = {
    options_executed: mergedExecuted.filter((id) => validOptionIds.has(id)),
    options_degraded: mergedDegraded.filter((id) => validOptionIds.has(id)),
    options_foreclosed: mergedForeclosed.filter((id) => validOptionIds.has(id)),
    options_unlocked: mergedUnlocked.filter((id) => validOptionIds.has(id)),
    thresholds_advanced: mergedThresholds.filter((id) => validConditionIds.has(id)),
  };

  // Remove contradictions: an option can't be in multiple categories
  removeContradictions(validated);

  // Build reasoning from all agents
  const reasoningParts = [];
  if (opt.reasoning) reasoningParts.push(opt.reasoning);
  if (thr.reasoning && thr.reasoning !== 'No threshold conditions in scope') reasoningParts.push(thr.reasoning);
  if (cross.reasoning) reasoningParts.push(cross.reasoning);
  validated.reasoning = reasoningParts.join(' | ') || 'No significant impacts detected.';

  // Flags from cross-theatre
  validated.flags = (cross.cross_theatre_flags || []).slice(0, 5);

  // Confidence based on how many agents contributed
  const agentsContributed = [
    hasContent(opt), hasContent(thr), hasContent(cross),
  ].filter(Boolean).length;
  validated.confidence = agentsContributed >= 2 ? 'high' : agentsContributed === 1 ? 'medium' : 'low';

  // Stats for trace
  const strippedCount =
    (mergedExecuted.length - validated.options_executed.length) +
    (mergedDegraded.length - validated.options_degraded.length) +
    (mergedForeclosed.length - validated.options_foreclosed.length) +
    (mergedUnlocked.length - validated.options_unlocked.length) +
    (mergedThresholds.length - validated.thresholds_advanced.length);
  validated._synthesis_stats = { strippedCount, agentsContributed };

  return validated;
}

function dedup(arr) {
  return [...new Set(arr)];
}

function hasContent(result) {
  const s = result?.suggestions || result || {};
  const arrays = [s.options_executed, s.options_degraded, s.options_foreclosed, s.options_unlocked, s.thresholds_advanced, s.cross_theatre_flags, s.options_affected, s.conditions_affected];
  return arrays.some((a) => Array.isArray(a) && a.length > 0);
}

/**
 * An option should only appear in one category. Priority: executed > foreclosed > degraded > unlocked.
 */
function removeContradictions(tags) {
  const executedSet = new Set(tags.options_executed);
  const foreclosedSet = new Set(tags.options_foreclosed);
  const degradedSet = new Set(tags.options_degraded);

  tags.options_foreclosed = tags.options_foreclosed.filter((id) => !executedSet.has(id));
  tags.options_degraded = tags.options_degraded.filter((id) => !executedSet.has(id) && !foreclosedSet.has(id));
  tags.options_unlocked = tags.options_unlocked.filter((id) => !executedSet.has(id) && !foreclosedSet.has(id) && !degradedSet.has(id));
}

module.exports = { synthesise };
