/**
 * Sanitize raw ingestion output before validation and queue insert.
 * Strip markdown fences, normalize dates, clean strings. No DB calls.
 */

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Strip markdown code fences and trim. Raw API output often wraps JSON in ```json ... ```
 */
function stripFences(text) {
  if (typeof text !== 'string') return text;
  let s = text.trim();
  const open = s.indexOf('```');
  if (open !== -1) {
    const afterOpen = s.indexOf('\n', open) + 1;
    const close = s.indexOf('```', afterOpen);
    if (close !== -1) s = s.slice(afterOpen, close).trim();
    else s = s.slice(afterOpen).trim();
  }
  return s;
}

/**
 * Normalize date/datetime string to ISO or null. Accepts date-only or full ISO.
 */
function normalizeDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (ISO_DATE_ONLY.test(s)) return s + 'T00:00:00Z';
  if (ISO_DATETIME.test(s)) return s;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Clean string: trim, collapse internal whitespace, max length for title/description.
 */
function cleanString(value, maxLength = null) {
  if (value == null) return '';
  const s = String(value).trim().replace(/\s+/g, ' ');
  return maxLength ? s.slice(0, maxLength) : s;
}

/**
 * Sanitize one event record from Perplexity (or similar) extraction.
 * Returns sanitized object; does not validate required fields or URLs.
 */
function sanitizeEventRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const actors = Array.isArray(raw.actors)
    ? raw.actors
        .filter((a) => a && (a.id || a.actor_id))
        .map((a) => ({
          id: a.id || a.actor_id,
          role: a.role || 'observer',
          side: a.side ?? null,
        }))
    : [];
  const theatres = Array.isArray(raw.theatres)
    ? raw.theatres.filter((t) => typeof t === 'string').map((t) => t.trim())
    : [];
  return {
    reported_at: normalizeDate(raw.reported_at),
    occurred_at: normalizeDate(raw.occurred_at),
    time_precision: ['exact', 'approximate', 'date_only', 'unknown'].includes(raw.time_precision)
      ? raw.time_precision
      : 'unknown',
    title: cleanString(raw.title, 80),
    description: cleanString(raw.description),
    theatres,
    actors,
    source_name: cleanString(raw.source_name),
    source_url: typeof raw.source_url === 'string' ? raw.source_url.trim() : '',
    source_type: ['wire', 'analysis', 'state_media', 'social', 'official'].includes(raw.source_type)
      ? raw.source_type
      : 'social',
    confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium',
    escalation_direction: ['escalatory', 'de-escalatory', 'neutral', 'ambiguous'].includes(raw.escalation_direction)
      ? raw.escalation_direction
      : null,
    escalation_intensity:
      typeof raw.escalation_intensity === 'number' && raw.escalation_intensity >= 1 && raw.escalation_intensity <= 5
        ? raw.escalation_intensity
        : null,
  };
}

/**
 * Parse raw API response (string or buffer) into array of event records.
 * Strips fences, JSON.parse, returns array (empty on parse failure).
 */
function parseRawEventArray(rawInput) {
  const text = typeof rawInput === 'string' ? rawInput : (rawInput && rawInput.toString()) || '';
  const json = stripFences(text);
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = {
  stripFences,
  normalizeDate,
  cleanString,
  sanitizeEventRecord,
  parseRawEventArray,
};
