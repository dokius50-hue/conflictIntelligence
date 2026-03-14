/**
 * Review-assist orchestrator: returns a short brief for the editor before approving/rejecting.
 * Combines context (72h events), verification (source URL check), and pattern detection.
 */
const { getQueueEvent } = require('../../lib/db/queue');
const { buildContext } = require('./context-builder');
const { verifySource } = require('./verifier');
const { detectPattern } = require('./pattern-detector');

async function getReviewBrief(queueId, conflictId) {
  const queueItem = await getQueueEvent(queueId);
  if (!queueItem) return null;
  const [context, verification] = await Promise.all([
    buildContext(queueItem, conflictId),
    verifySource(queueItem),
  ]);
  const pattern = detectPattern(queueItem, context.recentEvents);
  return {
    contextSummary: context.recentEvents.length > 0
      ? `${context.recentEvents.length} events in same theatres (last 72h)`
      : 'No recent events in same theatres.',
    verification: verification.ok ? 'Source URL verified' : `Source check: ${verification.reason}`,
    patternNote: pattern.note,
    flags: pattern.flags || [],
  };
}

module.exports = { getReviewBrief };
