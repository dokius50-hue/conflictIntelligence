/**
 * Assembles context for AI tag suggestions (Level 2: state-aware).
 * PRIMARY DIAL for tagging quality. No DB in components — this runs in script or backend.
 */
const path = require('path');
// When run from scripts/, resolve lib from project root
const projectRoot = path.resolve(__dirname, '../..');
const { getOptionsForActors } = require(path.join(projectRoot, 'lib/db/options'));
const { getThresholdsForTheatres, getThresholdConditions } = require(path.join(projectRoot, 'lib/db/thresholds'));
const { getRecentEvents } = require(path.join(projectRoot, 'lib/db/events'));

async function buildTaggingContext(eventRecord, conflictId, supabaseClient = null) {
  const relevantActorIds = (eventRecord.actors || []).map((a) => (typeof a === 'object' ? a.id : a));
  const relevantTheatreIds = eventRecord.theatres || [];

  const [options, thresholdData, recentEvents] = await Promise.all([
    getOptionsForActors(relevantActorIds, conflictId),
    relevantTheatreIds.length
      ? (async () => {
          const thresholds = await getThresholdsForTheatres(relevantTheatreIds, conflictId);
          const tids = thresholds.map((t) => t.id);
          const conditions = await getThresholdConditions(tids);
          return { thresholds, conditions };
        })()
      : Promise.resolve({ thresholds: [], conditions: [] }),
    getRecentEvents(relevantTheatreIds, 72, conflictId),
  ]);

  return {
    options,
    thresholds: thresholdData.thresholds,
    conditions: thresholdData.conditions,
    recentEvents,
  };
}

module.exports = {
  buildTaggingContext,
};
