const { getSupabase } = require('./lib/supabase');
const { requireAdminAuth } = require('./lib/adminAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const { queue_id, ...edits } = body;
  if (!queue_id) return res.status(400).json({ error: 'queue_id required' });
  try {
    const supabase = getSupabase();
    const { data: row, error: fetchErr } = await supabase
      .from('events_queue')
      .select('*')
      .eq('id', queue_id)
      .eq('status', 'pending')
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: 'Queue item not found or not pending' });
    const eventRow = {
      conflict_id: row.conflict_id,
      queue_id: row.id,
      reported_at: edits.reported_at ?? row.reported_at ?? new Date().toISOString(),
      occurred_at: edits.occurred_at ?? row.occurred_at,
      time_precision: edits.time_precision ?? row.time_precision ?? 'unknown',
      title: edits.title ?? row.title ?? '',
      description: edits.description ?? row.description ?? '',
      theatres: edits.theatres ?? row.theatres ?? [],
      actors: edits.actors ?? row.actors ?? [],
      source_name: edits.source_name ?? row.source_name ?? '',
      source_url: edits.source_url ?? row.source_url ?? '',
      source_type: edits.source_type ?? row.source_type ?? 'social',
      confidence: edits.confidence ?? row.ai_suggested_tags?.confidence ?? row.confidence ?? 'medium',
      escalation_direction: edits.escalation_direction ?? row.escalation_direction,
      escalation_intensity: edits.escalation_intensity ?? row.escalation_intensity,
      location_id: edits.location_id ?? row.location_id,
      options_executed: edits.options_executed ?? row.options_executed ?? row.ai_suggested_tags?.options_executed ?? [],
      options_degraded: edits.options_degraded ?? row.options_degraded ?? row.ai_suggested_tags?.options_degraded ?? [],
      options_foreclosed: edits.options_foreclosed ?? row.options_foreclosed ?? row.ai_suggested_tags?.options_foreclosed ?? [],
      options_unlocked: edits.options_unlocked ?? row.options_unlocked ?? row.ai_suggested_tags?.options_unlocked ?? [],
      thresholds_advanced: edits.thresholds_advanced ?? row.thresholds_advanced ?? row.ai_suggested_tags?.thresholds_advanced ?? [],
      corroborating_tweet_urls: edits.corroborating_tweet_urls ?? [],
      status: 'published',
      approved_by: edits.approved_by ?? null,
    };
    const { data: inserted, error: insertErr } = await supabase.from('events').insert(eventRow).select('id').single();
    if (insertErr) throw insertErr;

    // Propagate option and threshold state changes to config tables.
    // On failure: roll back the published event so the queue item stays pending.
    try {
      const optionStatusMap = [
        ...(eventRow.options_executed || []).map((id) => ({ id, status: 'executed' })),
        ...(eventRow.options_degraded || []).map((id) => ({ id, status: 'degraded' })),
        ...(eventRow.options_foreclosed || []).map((id) => ({ id, status: 'foreclosed' })),
        ...(eventRow.options_unlocked || []).map((id) => ({ id, status: 'available' })),
      ];
      for (const { id, status } of optionStatusMap) {
        const { error: optErr } = await supabase.from('config_options').update({ status }).eq('id', id);
        if (optErr) throw optErr;
      }

      const conditionIds = eventRow.thresholds_advanced || [];
      for (const id of conditionIds) {
        const { error: condErr } = await supabase.from('config_threshold_conditions').update({ status: 'satisfied' }).eq('id', id);
        if (condErr) throw condErr;
      }

      // Check whether any affected threshold is now fully crossed (all conditions satisfied).
      if (conditionIds.length > 0) {
        const { data: advancedRows } = await supabase
          .from('config_threshold_conditions')
          .select('threshold_id')
          .in('id', conditionIds);
        const affectedThresholdIds = [...new Set((advancedRows || []).map((c) => c.threshold_id))];
        for (const thresholdId of affectedThresholdIds) {
          const { data: allConds } = await supabase
            .from('config_threshold_conditions')
            .select('status')
            .eq('threshold_id', thresholdId);
          const allSatisfied =
            Array.isArray(allConds) &&
            allConds.length > 0 &&
            allConds.every((c) => c.status === 'satisfied');
          if (allSatisfied) {
            await supabase.from('config_thresholds').update({ status: 'crossed' }).eq('id', thresholdId);
          }
        }
      }

      await supabase.from('events_queue').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: edits.approved_by ?? null }).eq('id', queue_id);
    } catch (postInsertErr) {
      await supabase.from('events').delete().eq('id', inserted.id);
      throw postInsertErr;
    }

    return res.status(200).json({ event_id: inserted.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
