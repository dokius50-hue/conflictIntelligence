const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');
const { getThresholdsWithConditions } = require('../lib/db/thresholds');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;

  const supabase = getSupabase();
  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  if (req.method === 'GET') {
    try {
      const { data: theatres } = await supabase
        .from('config_theatres')
        .select('id')
        .eq('conflict_id', conflictId);
      const theatreIds = (theatres || []).map((t) => t.id);
      if (!theatreIds.length) return res.status(200).json({ thresholds: [], conditions: [] });
      const { thresholds, conditions } = await getThresholdsWithConditions(theatreIds, conflictId, false);
      return res.status(200).json({ thresholds: thresholds || [], conditions: conditions || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const { id, updates } = body;
    if (!id || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'id and updates required' });
    }
    const { status } = updates;
    if (!status || !['met', 'unmet', 'no_longer_applicable'].includes(status)) {
      return res.status(400).json({ error: 'updates.status must be met|unmet|no_longer_applicable' });
    }
    try {
      const { data: cond, error: fetchCondErr } = await supabase
        .from('config_threshold_conditions')
        .select('threshold_id')
        .eq('id', id)
        .single();
      if (fetchCondErr || !cond) return res.status(404).json({ error: 'Condition not found' });

      const { error: updateErr } = await supabase
        .from('config_threshold_conditions')
        .update({ status })
        .eq('id', id);
      if (updateErr) throw updateErr;

      const thresholdId = cond.threshold_id;
      const { data: allConds } = await supabase
        .from('config_threshold_conditions')
        .select('status')
        .eq('threshold_id', thresholdId);
      const allMet =
        Array.isArray(allConds) &&
        allConds.length > 0 &&
        allConds.every((c) => c.status === 'met');

      let thresholdCrossed = false;
      if (allMet) {
        await supabase.from('config_thresholds').update({ status: 'crossed' }).eq('id', thresholdId);
        thresholdCrossed = true;
      }

      const { data: theatres } = await supabase
        .from('config_theatres')
        .select('id')
        .eq('conflict_id', conflictId);
      const theatreIds = (theatres || []).map((t) => t.id);
      const { thresholds, conditions } = theatreIds.length
        ? await getThresholdsWithConditions(theatreIds, conflictId, false)
        : { thresholds: [], conditions: [] };

      return res.status(200).json({
        thresholds: thresholds || [],
        conditions: conditions || [],
        thresholdCrossed,
        thresholdId: thresholdCrossed ? thresholdId : undefined,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
