const { getPublishedPerspectives } = require('../lib/db/perspectives');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const theatre = req.query.theatre;

  try {
    let data = await getPublishedPerspectives(conflictId, { limit });
    if (theatre) {
      data = data.filter((p) => p.theatres?.includes(theatre));
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
