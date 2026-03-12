/**
 * Query tool: config_options. No analytical logic; reasoning lives in lib/reasoning/options.js.
 */
const { getSupabase } = require('../supabase');

async function getOptionsForActors(actorIds, conflictId = null, activeOnly = true) {
  if (!Array.isArray(actorIds) || actorIds.length === 0) return [];
  const supabase = getSupabase();
  let q = supabase.from('config_options').select('*').in('actor_id', actorIds);
  if (conflictId) q = q.eq('conflict_id', conflictId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('intensity');
  if (error) throw error;
  return data || [];
}

async function getActorOptions(actorId, conflictId = null) {
  return getOptionsForActors([actorId], conflictId);
}

async function getAllOptionsForConflict(conflictId, activeOnly = true) {
  let q = getSupabase().from('config_options').select('*').eq('conflict_id', conflictId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('actor_id').order('intensity');
  if (error) throw error;
  return data || [];
}

module.exports = {
  getOptionsForActors,
  getActorOptions,
  getAllOptionsForConflict,
};
