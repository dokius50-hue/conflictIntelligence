/**
 * Theatre-searcher agent. One Perplexity Sonar call per theatre.
 * Prompt is built dynamically from config (theatres, actors, locations) —
 * adding a new conflict or theatre automatically generates correct prompts.
 * Reuses sanitize.js and validate.js from scripts/lib, plus Zod validation.
 *
 * NOTE: The old ingest-perplexity.js has hardcoded PROMPTS per conflict_id.
 * This replaces that pattern with config-driven prompts. When the agent
 * pipeline is stable, the old script can be retired. Until then both coexist.
 */
const { callPerplexity } = require('../lib/llm');
const { parseRawEventArray, sanitizeEventRecord } = require('../../scripts/lib/sanitize');
const { validateEventRecord } = require('../../scripts/lib/validate');
const { validateCandidates } = require('./validators');

/**
 * Build a prompt for one theatre using config data.
 * The prompt asks Perplexity to extract recent events as structured JSON.
 */
function buildPrompt(theatre, actors, locations) {
  const locationNames = locations
    .filter((l) => l.theatre_id === theatre.id)
    .map((l) => l.label || l.id)
    .join(', ');

  const allLocationNames = locations.map((l) => l.label || l.id).join(', ');

  const actorList = actors.map((a) => a.id).join(', ');
  const actorDetails = actors
    .map((a) => `${a.id} (${a.label || a.id})`)
    .join(', ');

  const theatreLabel = theatre.label || theatre.id;

  return `You are an intelligence extraction agent focused on the ${theatreLabel} theatre.

Key locations in this theatre: ${locationNames || 'not specified'}.
Broader area locations: ${allLocationNames || 'not specified'}.
Known actors: ${actorDetails}.

Extract structured event data from the last 24-48 hours related to this theatre.

For each distinct event, return a JSON array of objects with these fields:
{
  "reported_at": "ISO 8601 datetime",
  "occurred_at": "ISO 8601 or null",
  "time_precision": "exact|approximate|date_only|unknown",
  "title": "one line, max 80 chars",
  "description": "2-4 factual sentences",
  "theatres": ["${theatre.id}"],
  "actors": [{"id": "<actor_id>", "role": "attacker|defender|mediator|observer", "side": "<side or null>"}],
  "source_name": "publication name",
  "source_url": "full URL — REQUIRED",
  "source_type": "wire|analysis|state_media|social|official",
  "confidence": "high|medium|low",
  "escalation_direction": "escalatory|de-escalatory|neutral|ambiguous",
  "escalation_intensity": 1-5,
  "key_findings": [{"finding": "one bullet", "attribution": "source", "type": "fact|claim|analysis|rumour"}],
  "confidence_reasoning": "why confidence is high/medium/low"
}

Valid actor IDs: ${actorList}.
Valid theatre IDs: ${theatre.id}.
Return ONLY the JSON array. No preamble, no markdown fences.
Omit any event without a verifiable source_url.
If no events found, return an empty array: []`;
}

/**
 * Search one theatre. Returns { candidates, rejected, trace }.
 * @param {object} theatre - row from config_theatres
 * @param {object[]} actors - rows from config_actors
 * @param {object[]} locations - rows from config_locations
 * @param {string} conflictId
 */
async function searchTheatre(theatre, actors, locations, conflictId) {
  const prompt = buildPrompt(theatre, actors, locations);
  const trace = {
    stage: 'theatre-searcher',
    theatre_id: theatre.id,
    prompt_length: prompt.length,
    started_at: new Date().toISOString(),
  };

  let rawContent;
  try {
    rawContent = await callPerplexity(prompt);
  } catch (err) {
    trace.error = err.message;
    trace.finished_at = new Date().toISOString();
    return { candidates: [], rejected: [], trace };
  }

  if (!rawContent) {
    trace.note = 'No content returned (API key missing or empty response)';
    trace.finished_at = new Date().toISOString();
    return { candidates: [], rejected: [], trace };
  }

  trace.raw_length = rawContent.length;

  const rawArray = parseRawEventArray(rawContent);
  trace.parsed_count = rawArray.length;

  const sanitized = rawArray
    .map((r) => sanitizeEventRecord(r))
    .filter(Boolean);
  trace.sanitized_count = sanitized.length;

  const passedValidation = [];
  const failedLegacy = [];
  for (const rec of sanitized) {
    const { valid, errors } = validateEventRecord(rec);
    if (valid) {
      rec.key_findings = rec.key_findings || [];
      rec.confidence_reasoning = rec.confidence_reasoning || null;
      passedValidation.push(rec);
    } else {
      failedLegacy.push({ item: rec, errors });
    }
  }
  trace.legacy_valid_count = passedValidation.length;
  trace.legacy_rejected_count = failedLegacy.length;

  const { valid: candidates, rejected } = validateCandidates(passedValidation);
  trace.zod_valid_count = candidates.length;
  trace.zod_rejected_count = rejected.length;
  trace.finished_at = new Date().toISOString();

  return { candidates, rejected: [...failedLegacy, ...rejected], trace };
}

module.exports = { searchTheatre, buildPrompt };
