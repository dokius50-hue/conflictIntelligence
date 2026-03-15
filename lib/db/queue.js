/**
 * Query tool: events_queue and tweets_queue. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getPendingQueueEvents(conflictId, limit = 100) {
  const { data, error } = await getSupabase()
    .from('events_queue')
    .select('*')
    .eq('conflict_id', conflictId)
    .eq('status', 'pending')
    .order('ingested_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getQueueEvent(id) {
  const { data, error } = await getSupabase().from('events_queue').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

/**
 * Recent queue events for dedup comparison. Returns last N hours across all statuses.
 * Only selects columns needed for dedup (not full raw_input blobs).
 * @param {string} conflictId
 * @param {number} hours - lookback window (default 48, configurable per caller)
 * @param {number} limit - max rows (default 500)
 */
async function getRecentQueueEvents(conflictId, hours = 48, limit = 500) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabase()
    .from('events_queue')
    .select('id, title, description, theatres, actors, source_url, source_name, confidence, reported_at, status')
    .eq('conflict_id', conflictId)
    .gte('ingested_at', since)
    .order('ingested_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Insert a single event into events_queue. Centralises the insert so agent and
 * script pipelines share one path and future column changes only need one update.
 * @returns {{ data, error }}
 */
async function insertQueueEvent(row) {
  const { data, error } = await getSupabase()
    .from('events_queue')
    .insert(row)
    .select()
    .single();
  return { data, error };
}

module.exports = {
  getPendingQueueEvents,
  getQueueEvent,
  getRecentQueueEvents,
  insertQueueEvent,
};
