/**
 * On-demand AI tag suggestions for a queue event.
 * GET /api/suggest-tags?queue_id=<uuid>&conflict_id=<id>
 * Runs the 3-agent tagging swarm (option-analyst, threshold-analyst, cross-theatre)
 * then synthesises into validated tag suggestions.
 * Admin auth required.
 */
const { requireAdminAuth } = require('./lib/adminAuth');
const { getQueueEvent } = require('../lib/db/queue');
const { suggestTagsAgent } = require('../agents/tagging/orchestrator');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const queueId = req.query.queue_id;
  if (!queueId) return res.status(400).json({ error: 'queue_id required' });
  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  try {
    const eventRecord = await getQueueEvent(queueId);
    if (!eventRecord) return res.status(404).json({ error: 'Queue item not found' });

    const { tags, trace } = await suggestTagsAgent(eventRecord, conflictId);
    return res.status(200).json({ tags, trace });
  } catch (e) {
    console.error('[suggest-tags]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
