/**
 * Perplexity API → sanitize → validate → events_queue.
 * Nothing writes to published tables. Raw output saved to /logs/raw/.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('./lib/supabase');
const { parseRawEventArray, sanitizeEventRecord } = require('./lib/sanitize');
const { validateEventRecord, getAutoApproveEligible, logRejected } = require('./lib/validate');

const CONFLICT_ID = process.env.CONFLICT_ID || 'hormuz_2026';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

function ensureLogDir(subdir) {
  const dir = path.join(process.cwd(), 'logs', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveRaw(source, data) {
  const dir = ensureLogDir('raw');
  const name = `${new Date().toISOString().slice(0, 13).replace('T', '-')}-${source}.json`;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), 'utf8');
}

async function callPerplexity(prompt) {
  if (!PERPLEXITY_API_KEY) {
    console.warn('PERPLEXITY_API_KEY not set; skipping live call. Use raw fixture for testing.');
    return null;
  }
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  return content || null;
}

const PROMPTS = {
  hormuz_2026: `You are an intelligence extraction agent. Extract structured event data from recent news about the Strait of Hormuz / Gulf tensions.

For each distinct event from the last 24-48 hours, return a JSON array with exactly these fields:
{"reported_at":"ISO 8601","occurred_at":"ISO or null","time_precision":"exact|approximate|date_only|unknown","title":"one line max 80 chars","description":"2-4 sentences factual","theatres":["gulf_waters","red_sea"],"actors":[{"id":"iran","role":"attacker","side":"iran_axis"}],"source_name":"publication","source_url":"full URL required","source_type":"wire|analysis|state_media|social|official","confidence":"high|medium|low","escalation_direction":"escalatory|de-escalatory|neutral|ambiguous","escalation_intensity":1-5}

Valid actor IDs: iran, usa, gcc. Valid theatre IDs: gulf_waters, red_sea.
Return ONLY the JSON array. No preamble. No markdown fences. Omit any event without a verifiable source_url.`,
  pak_afg_2025: `You are an intelligence extraction agent. Extract structured event data from recent news about Pakistan–Afghanistan tensions, TTP (Tehrik-i-Taliban Pakistan) cross-border activity, and Durand Line dynamics.

For each distinct event from the last 24-48 hours, return a JSON array with exactly these fields:
{"reported_at":"ISO 8601","occurred_at":"ISO or null","time_precision":"exact|approximate|date_only|unknown","title":"one line max 80 chars","description":"2-4 sentences factual","theatres":["border_region","pakistan_tribal","afghanistan_interior"],"actors":[{"id":"pakistan","role":"attacker","side":"state"}],"source_name":"publication","source_url":"full URL required","source_type":"wire|analysis|state_media|social|official","confidence":"high|medium|low","escalation_direction":"escalatory|de-escalatory|neutral|ambiguous","escalation_intensity":1-5}

Valid actor IDs: pakistan, afghanistan, ttp, china. Valid theatre IDs: border_region, pakistan_tribal, afghanistan_interior.
Return ONLY the JSON array. No preamble. No markdown fences. Omit any event without a verifiable source_url.`,
};

async function run() {
  const prompt = PROMPTS[CONFLICT_ID] || PROMPTS.hormuz_2026;

  const rawContent = await callPerplexity(prompt);
  const rawPayload = rawContent ? { raw: rawContent, prompt } : null;
  if (rawPayload) saveRaw('perplexity', rawPayload);

  if (!rawContent) {
    console.log('No Perplexity response; exiting.');
    return;
  }

  const rawArray = parseRawEventArray(rawContent);
  let inserted = 0;
  let rejected = 0;

  for (const raw of rawArray) {
    const sanitized = sanitizeEventRecord(raw);
    if (!sanitized) {
      logRejected('sanitize returned null', raw);
      rejected++;
      continue;
    }
    const { valid, errors } = validateEventRecord(sanitized);
    if (!valid) {
      logRejected(errors.join('; '), sanitized);
      rejected++;
      continue;
    }
    const autoApprove = await getAutoApproveEligible(
      supabase,
      sanitized.source_name,
      sanitized.source_type,
      CONFLICT_ID
    );
    const row = {
      conflict_id: CONFLICT_ID,
      reported_at: sanitized.reported_at || new Date().toISOString(),
      occurred_at: sanitized.occurred_at,
      time_precision: sanitized.time_precision,
      title: sanitized.title,
      description: sanitized.description,
      theatres: sanitized.theatres || [],
      actors: sanitized.actors || [],
      source_name: sanitized.source_name,
      source_url: sanitized.source_url,
      source_type: sanitized.source_type,
      confidence: sanitized.confidence,
      escalation_direction: sanitized.escalation_direction,
      escalation_intensity: sanitized.escalation_intensity,
      status: 'pending',
      ingestion_source: 'perplexity',
      auto_approve_eligible: autoApprove,
      raw_input: rawContent,
    };
    const { error } = await supabase.from('events_queue').insert(row);
    if (error) {
      logRejected(error.message, row);
      rejected++;
    } else {
      inserted++;
    }
  }

  console.log(`Perplexity ingest: ${inserted} queued, ${rejected} rejected.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
