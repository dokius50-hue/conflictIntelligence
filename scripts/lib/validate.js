/**
 * Validation before queue insert. Reject no-URL records; log rejects to /logs/failed/.
 * auto_approve_eligible from config_sources — not hardcoded.
 */

const path = require('path');
const fs = require('fs');

/**
 * Returns true if event has a valid source URL (required for approval).
 */
function hasValidSourceUrl(record) {
  const url = record?.source_url;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
}

/**
 * Validate sanitized event record. Returns { valid: boolean, errors: string[] }.
 */
function validateEventRecord(record) {
  const errors = [];
  if (!record.title || record.title.trim().length === 0) errors.push('title required');
  if (!record.description || record.description.trim().length === 0) errors.push('description required');
  if (!hasValidSourceUrl(record)) errors.push('source_url required and must be http(s)');
  if (!Array.isArray(record.theatres)) errors.push('theatres must be array');
  if (!Array.isArray(record.actors)) errors.push('actors must be array');
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get auto_approve_eligible for (sourceName, sourceType, conflictId) from config_sources.
 * Conflict-specific override wins; then source_name specific; then type-only. One row.
 */
async function getAutoApproveEligible(supabase, sourceName, sourceType, conflictId) {
  const { data, error } = await supabase
    .from('config_sources')
    .select('auto_approve_eligible')
    .eq('source_type', sourceType)
    .or(`conflict_id.eq.${conflictId},conflict_id.is.null`)
    .or(`source_name.eq.${sourceName},source_name.is.null`)
    .order('conflict_id', { ascending: false, nullsFirst: false })
    .order('source_name', { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) return false;
  return data?.[0]?.auto_approve_eligible ?? false;
}

/**
 * Write rejected payload to /logs/failed/ for inspection.
 */
function logRejected(reason, payload) {
  const dir = path.join(process.cwd(), 'logs', 'failed');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = `failed-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(
      path.join(dir, name),
      JSON.stringify({ reason, payload }, null, 2),
      'utf8'
    );
  } catch (e) {
    console.error('Failed to write logs/failed:', e.message);
  }
}

module.exports = {
  hasValidSourceUrl,
  validateEventRecord,
  getAutoApproveEligible,
  logRejected,
};
