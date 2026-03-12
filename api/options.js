const { getAllOptionsForConflict } = require('../lib/db/options');
const { getResidualOptionSpace } = require('../lib/reasoning/options');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  try {
    const options = await getAllOptionsForConflict(conflictId);
    const actorIds = [...new Set(options.map((o) => o.actor_id))];

    // Apply residual reasoning per actor — returns available + locked options
    const residualByActor = {};
    actorIds.forEach((aid) => {
      residualByActor[aid] = getResidualOptionSpace(aid, options, []);
    });

    // Also return executed/degraded options separately (not in residual space)
    const executed = options.filter((o) => o.status === 'executed');
    const degraded = options.filter((o) => o.status === 'degraded');

    return res.status(200).json({ options, residualByActor, executed, degraded });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
