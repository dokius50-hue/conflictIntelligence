/**
 * Query tool: perspectives. No analytical logic.
 */
const { getSupabase } = require('../supabase');

async function getPublishedPerspectives(conflictId, options = {}) {
  const { limit = 50 } = options;
  const { data, error } = await getSupabase()
    .from('perspectives')
    .select('*')
    .eq('conflict_id', conflictId)
    .eq('status', 'published')
    .order('posted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = {
  getPublishedPerspectives,
};
