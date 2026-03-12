/**
 * Query tool: config entities. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getActors(conflictId, activeOnly = true) {
  const q = getSupabase().from('config_actors').select('*').eq('conflict_id', conflictId);
  if (activeOnly) q.eq('is_active', true);
  const { data, error } = await q.order('id');
  if (error) throw error;
  return data || [];
}

async function getTheatres(conflictId) {
  const { data, error } = await getSupabase()
    .from('config_theatres')
    .select('*')
    .eq('conflict_id', conflictId)
    .order('id');
  if (error) throw error;
  return data || [];
}

async function getLocations(conflictId, activeOnly = true) {
  const q = getSupabase().from('config_locations').select('*').eq('conflict_id', conflictId);
  if (activeOnly) q.eq('is_active', true);
  const { data, error } = await q.order('id');
  if (error) throw error;
  return data || [];
}

async function getSources(conflictId = null) {
  let q = getSupabase().from('config_sources').select('*');
  if (conflictId) q = q.or(`conflict_id.eq.${conflictId},conflict_id.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

module.exports = {
  getActors,
  getTheatres,
  getLocations,
  getSources,
};
