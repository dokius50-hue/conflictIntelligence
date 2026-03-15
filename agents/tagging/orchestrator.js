/**
 * Tagging swarm orchestrator. Runs 3 analyst agents in parallel, then
 * synthesises their outputs into validated tag suggestions.
 *
 * Called on demand when admin opens a queue item (not during ingestion).
 * All DB reads happen here; sub-agents are pure (receive context, return tags).
 *
 * Cost: 3 Claude calls per invocation (option-analyst, threshold-analyst, cross-theatre).
 * Synthesis is deterministic (no LLM call).
 */
const { getActors, getTheatres, getLocations } = require('../../lib/db/config');
const { getAllOptionsForConflict } = require('../../lib/db/options');
const { getThresholdsWithConditions } = require('../../lib/db/thresholds');
const { getRecentEvents } = require('../../lib/db/events');
const { analyseOptions } = require('./option-analyst');
const { analyseThresholds } = require('./threshold-analyst');
const { analyseCrossTheatre } = require('./cross-theatre');
const { synthesise } = require('./synthesis');

/**
 * Get tag suggestions for a queue event.
 * @param {object} eventRecord - the queue row
 * @param {string} conflictId
 * @returns {{ tags, trace }}
 */
async function suggestTagsAgent(eventRecord, conflictId) {
  const trace = {
    stage: 'tagging-orchestrator',
    event_id: eventRecord.id,
    conflict_id: conflictId,
    started_at: new Date().toISOString(),
  };

  // Load context in parallel
  const relevantTheatreIds = eventRecord.theatres || [];
  const [allOptions, thresholdData, recentEvents, allTheatres] = await Promise.all([
    getAllOptionsForConflict(conflictId),
    relevantTheatreIds.length > 0
      ? getThresholdsWithConditions(relevantTheatreIds, conflictId)
      : Promise.resolve({ thresholds: [], conditions: [] }),
    getRecentEvents(relevantTheatreIds, 72, conflictId),
    getTheatres(conflictId),
  ]);

  const validOptionIds = new Set(allOptions.map((o) => o.id));
  const validConditionIds = new Set((thresholdData.conditions || []).map((c) => c.id));
  trace.context = {
    options_count: allOptions.length,
    thresholds_count: thresholdData.thresholds.length,
    conditions_count: thresholdData.conditions.length,
    recent_events_count: recentEvents.length,
    theatres_count: allTheatres.length,
  };

  // Run 3 analysts in parallel (each is 1 Claude call)
  const [optionResult, thresholdResult, crossTheatreResult] = await Promise.allSettled([
    analyseOptions(eventRecord, allOptions, recentEvents),
    analyseThresholds(eventRecord, thresholdData.thresholds, thresholdData.conditions, recentEvents),
    analyseCrossTheatre(eventRecord, allTheatres, allOptions, thresholdData.thresholds, thresholdData.conditions),
  ]);

  const optOut = optionResult.status === 'fulfilled'
    ? optionResult.value
    : { suggestions: { options_executed: [], options_degraded: [], options_foreclosed: [], options_unlocked: [], reasoning: 'Agent failed' }, trace: { error: optionResult.reason?.message } };

  const thrOut = thresholdResult.status === 'fulfilled'
    ? thresholdResult.value
    : { suggestions: { thresholds_advanced: [], reasoning: 'Agent failed' }, trace: { error: thresholdResult.reason?.message } };

  const crossOut = crossTheatreResult.status === 'fulfilled'
    ? crossTheatreResult.value
    : { suggestions: { cross_theatre_flags: [], options_affected: [], conditions_affected: [], reasoning: 'Agent failed' }, trace: { error: crossTheatreResult.reason?.message } };

  trace.agents = {
    option_analyst: optOut.trace,
    threshold_analyst: thrOut.trace,
    cross_theatre: crossOut.trace,
  };

  // Synthesise (deterministic — no LLM)
  const tags = synthesise(optOut, thrOut, crossOut, validOptionIds, validConditionIds);
  trace.synthesis = tags._synthesis_stats;
  delete tags._synthesis_stats;

  trace.finished_at = new Date().toISOString();

  return { tags, trace };
}

module.exports = { suggestTagsAgent };
