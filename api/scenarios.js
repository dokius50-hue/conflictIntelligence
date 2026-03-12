const { getScenariosForConflict, getScenarioConditions } = require('../lib/db/scenarios');
const { getFalsifiedScenarios } = require('../lib/reasoning/scenarios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';
  try {
    const scenarios = await getScenariosForConflict(conflictId);
    const conditions = await getScenarioConditions(scenarios.map((s) => s.id));
    const withViability = getFalsifiedScenarios(scenarios, conditions);

    // Attach conditions to each scenario for the frontend
    const condsByScenario = {};
    conditions.forEach((c) => {
      if (!condsByScenario[c.scenario_id]) condsByScenario[c.scenario_id] = [];
      condsByScenario[c.scenario_id].push(c);
    });

    const result = withViability.map((s) => ({
      ...s,
      conditions: condsByScenario[s.id] || [],
    }));

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
