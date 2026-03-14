/**
 * Pulls last 72h published events for the same theatres as the queue item.
 * Used by review-assist orchestrator to give the editor temporal context.
 */
const { getRecentEvents } = require('../../lib/db/events');

async function buildContext(queueItem, conflictId) {
  const theatreIds = queueItem.theatres || [];
  if (theatreIds.length === 0) return { recentEvents: [] };
  const recentEvents = await getRecentEvents(theatreIds, 72, conflictId);
  return { recentEvents };
}

module.exports = { buildContext };
