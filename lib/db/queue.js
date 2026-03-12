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

module.exports = {
  getPendingQueueEvents,
  getQueueEvent,
};
