/**
 * Query tool: published events. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getPublishedEvents(options = {}) {
  const { conflictId, theatres, limit = 50, sinceHours = null } = options;
  let q = getSupabase().from('events').select('*').eq('status', 'published').order('reported_at', { ascending: false });
  if (conflictId) q = q.eq('conflict_id', conflictId);
  if (Array.isArray(theatres) && theatres.length > 0) q = q.overlaps('theatres', theatres);
  if (sinceHours != null) {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    q = q.gte('reported_at', since);
  }
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Last N hours of events in given theatres (for tagging context). */
async function getRecentEvents(theatreIds, hours = 72, conflictId = null) {
  return getPublishedEvents({ conflictId, theatres: theatreIds, sinceHours: hours, limit: 200 });
}

module.exports = {
  getPublishedEvents,
  getRecentEvents,
};
