const { requireAdminAuth } = require('./lib/adminAuth');
const { getReviewBrief } = require('../agents/review-assist/orchestrator');

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
    const brief = await getReviewBrief(queueId, conflictId);
    if (!brief) return res.status(404).json({ error: 'Queue item not found' });
    return res.status(200).json(brief);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
