const { getSupabase } = require('./lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const { tweet_id, disposition, event_payload, perspective_payload, corroborates_event_id, reviewer_notes } = body;
  if (!tweet_id || !disposition) return res.status(400).json({ error: 'tweet_id and disposition required' });
  try {
    const supabase = getSupabase();
    const { data: tweet, error: fetchErr } = await supabase
      .from('tweets_queue')
      .select('*')
      .eq('id', tweet_id)
      .single();
    if (fetchErr || !tweet) return res.status(404).json({ error: 'Tweet queue item not found' });

    let promotedEventId = null;
    let promotedPerspectiveId = null;
    let corroboratesId = null;

    if (disposition === 'event' && event_payload) {
      const { data, error } = await supabase
        .from('events')
        .insert({
          conflict_id: tweet.conflict_id,
          reported_at: event_payload.reported_at || tweet.posted_at,
          occurred_at: event_payload.occurred_at || tweet.posted_at,
          time_precision: event_payload.time_precision || 'unknown',
          title: event_payload.title,
          description: event_payload.description,
          theatres: event_payload.theatres || [],
          actors: event_payload.actors || [],
          source_name: event_payload.source_name || tweet.author_handle,
          source_url: event_payload.source_url || tweet.tweet_url,
          source_type: event_payload.source_type || 'social',
          confidence: event_payload.confidence || 'medium',
          escalation_direction: event_payload.escalation_direction || null,
          escalation_intensity: event_payload.escalation_intensity || null,
          location_id: event_payload.location_id || null,
          options_executed: event_payload.options_executed || [],
          options_degraded: event_payload.options_degraded || [],
          options_foreclosed: event_payload.options_foreclosed || [],
          options_unlocked: event_payload.options_unlocked || [],
          thresholds_advanced: event_payload.thresholds_advanced || [],
          corroborating_tweet_urls: [tweet.tweet_url],
        })
        .select('id')
        .single();
      if (error) throw error;
      promotedEventId = data.id;
    }

    if (disposition === 'perspective' && perspective_payload) {
      const { data, error } = await supabase
        .from('perspectives')
        .insert({
          conflict_id: tweet.conflict_id,
          author_handle: tweet.author_handle,
          author_name: tweet.author_name,
          author_type: tweet.author_type,
          tweet_url: tweet.tweet_url,
          tweet_text: tweet.tweet_text,
          summary: perspective_payload.summary || null,
          theatres: perspective_payload.theatres || [],
          actors: perspective_payload.actors || [],
          posted_at: tweet.posted_at,
        })
        .select('id')
        .single();
      if (error) throw error;
      promotedPerspectiveId = data.id;
    }

    if (disposition === 'corroboration' && corroborates_event_id) {
      corroboratesId = corroborates_event_id;
      const { error } = await supabase
        .from('events')
        .update({
          corroborating_tweet_urls: supabase.rpc('array_append_distinct', {
            arr: 'corroborating_tweet_urls',
            val: tweet.tweet_url,
          }),
        })
        .eq('id', corroborates_event_id);
      if (error) console.error('Failed to append corroborating tweet URL', error.message);
    }

    const { error: updateErr } = await supabase
      .from('tweets_queue')
      .update({
        disposition,
        promoted_event_id: promotedEventId,
        promoted_perspective_id: promotedPerspectiveId,
        corroborates_event_id: corroboratesId,
        reviewer_notes: reviewer_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', tweet_id);
    if (updateErr) throw updateErr;

    return res.status(200).json({
      ok: true,
      promoted_event_id: promotedEventId,
      promoted_perspective_id: promotedPerspectiveId,
      corroborates_event_id: corroboratesId,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

