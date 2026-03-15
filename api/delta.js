const { getSupabase } = require('./lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const conflictId = req.query.conflict_id || process.env.CONFLICT_ID || 'hormuz_2026';

  try {
    const supabase = getSupabase();

    const { data: conflict, error: conflictErr } = await supabase
      .from('config_conflicts')
      .select('id, name, last_reviewed_at')
      .eq('id', conflictId)
      .single();
    if (conflictErr || !conflict) return res.status(404).json({ error: 'Conflict not found' });

    const since = conflict.last_reviewed_at;

    let eventsQuery = supabase
      .from('events')
      .select('id, title, reported_at, approved_at, theatres, confidence, options_executed, options_degraded, options_foreclosed, options_unlocked, thresholds_advanced')
      .eq('conflict_id', conflictId)
      .eq('status', 'published')
      .order('approved_at', { ascending: false })
      .limit(100);

    if (since) {
      eventsQuery = eventsQuery.gt('approved_at', since);
    }

    const { data: newEvents, error: eventsErr } = await eventsQuery;
    if (eventsErr) throw eventsErr;

    // Aggregate option/threshold movements from all new events.
    const movements = {
      options_executed: [],
      options_degraded: [],
      options_foreclosed: [],
      options_unlocked: [],
      thresholds_advanced: [],
    };
    for (const ev of newEvents || []) {
      for (const id of ev.options_executed || []) {
        if (!movements.options_executed.includes(id)) movements.options_executed.push(id);
      }
      for (const id of ev.options_degraded || []) {
        if (!movements.options_degraded.includes(id)) movements.options_degraded.push(id);
      }
      for (const id of ev.options_foreclosed || []) {
        if (!movements.options_foreclosed.includes(id)) movements.options_foreclosed.push(id);
      }
      for (const id of ev.options_unlocked || []) {
        if (!movements.options_unlocked.includes(id)) movements.options_unlocked.push(id);
      }
      for (const id of ev.thresholds_advanced || []) {
        if (!movements.thresholds_advanced.includes(id)) movements.thresholds_advanced.push(id);
      }
    }

    return res.status(200).json({
      last_reviewed_at: since,
      new_events: (newEvents || []).map((e) => ({
        id: e.id,
        title: e.title,
        reported_at: e.reported_at,
        approved_at: e.approved_at,
        theatres: e.theatres,
        confidence: e.confidence,
      })),
      movements,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
