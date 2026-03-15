/**
 * Deduplicator agent. ONE batched Claude call compares all new candidates
 * against recent queue events + recent published events.
 * Conservative: validation failure or uncertain verdict → treat as new.
 */
const { callClaudeJSON } = require('../lib/llm');
const { dedupResultSchema } = require('./validators');

/**
 * Build a compact summary of existing events for the dedup prompt.
 * Keeps token usage low by only sending essential fields.
 */
function summariseExisting(events) {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: (e.description || '').slice(0, 200),
    source_url: e.source_url,
    reported_at: e.reported_at,
    theatres: e.theatres,
  }));
}

function summariseCandidates(candidates) {
  return candidates.map((c, i) => ({
    index: i,
    title: c.title,
    description: (c.description || '').slice(0, 200),
    source_url: c.source_url,
    reported_at: c.reported_at,
    theatres: c.theatres,
  }));
}

function buildDedupPrompt(candidateSummaries, existingSummaries) {
  return `You are a deduplication agent for a conflict intelligence system.

EXISTING events already in the queue or published (may overlap with candidates):
${JSON.stringify(existingSummaries, null, 1)}

NEW candidate events to evaluate:
${JSON.stringify(candidateSummaries, null, 1)}

For each candidate (by index), decide if it is a DUPLICATE of an existing event or NEW.
Two events are duplicates if they describe the same real-world incident, even if wording or sources differ.
Different events at the same location on different dates are NOT duplicates.
Different aspects of the same incident reported by different sources ARE duplicates.

When uncertain, mark as "new" — we prefer duplicates in the queue over missed events.

Return a JSON array with one object per candidate:
[{"candidate_index": 0, "verdict": "new"|"duplicate", "duplicate_of_queue_id": "<uuid or null>", "reasoning": "brief explanation"}]

Return ONLY the JSON array. No preamble.`;
}

/**
 * Deduplicate candidates against recent events. Returns candidates annotated
 * with dedup verdict and trace.
 *
 * @param {object[]} candidates - from theatre-searcher
 * @param {object[]} recentQueueEvents - from getRecentQueueEvents
 * @param {object[]} recentPublishedEvents - from getPublishedEvents (approved items, higher trust)
 * @returns {{ candidates: annotated[], trace }}
 */
async function deduplicateCandidates(candidates, recentQueueEvents = [], recentPublishedEvents = []) {
  const trace = {
    stage: 'deduplicator',
    candidate_count: candidates.length,
    existing_queue_count: recentQueueEvents.length,
    existing_published_count: recentPublishedEvents.length,
    started_at: new Date().toISOString(),
  };

  if (candidates.length === 0) {
    trace.note = 'No candidates to dedup';
    trace.finished_at = new Date().toISOString();
    return { candidates: [], trace };
  }

  const allExisting = [
    ...recentPublishedEvents.map((e) => ({ ...e, _source: 'published' })),
    ...recentQueueEvents.map((e) => ({ ...e, _source: 'queue' })),
  ];

  if (allExisting.length === 0) {
    trace.note = 'No existing events to compare — all candidates treated as new';
    trace.finished_at = new Date().toISOString();
    const annotated = candidates.map((c) => ({
      ...c,
      _dedup: { verdict: 'new', reasoning: 'No existing events to compare' },
    }));
    return { candidates: annotated, trace };
  }

  const candidateSummaries = summariseCandidates(candidates);
  const existingSummaries = summariseExisting(allExisting);
  const prompt = buildDedupPrompt(candidateSummaries, existingSummaries);
  trace.prompt_length = prompt.length;

  let verdicts;
  try {
    const { data } = await callClaudeJSON(prompt, dedupResultSchema, { maxTokens: 2048 });
    if (!data) {
      trace.note = 'Claude returned null (API key missing) — treating all as new';
      trace.finished_at = new Date().toISOString();
      return {
        candidates: candidates.map((c) => ({
          ...c,
          _dedup: { verdict: 'new', reasoning: 'No Claude response' },
        })),
        trace,
      };
    }
    verdicts = data;
    trace.verdicts_count = verdicts.length;
  } catch (err) {
    trace.error = err.message;
    trace.note = 'Dedup failed — conservative fallback, treating all as new';
    trace.finished_at = new Date().toISOString();
    return {
      candidates: candidates.map((c) => ({
        ...c,
        _dedup: { verdict: 'new', reasoning: `Dedup error: ${err.message}` },
      })),
      trace,
    };
  }

  const verdictMap = new Map();
  for (const v of verdicts) {
    verdictMap.set(v.candidate_index, v);
  }

  const annotated = candidates.map((c, i) => {
    const v = verdictMap.get(i);
    if (!v) {
      return { ...c, _dedup: { verdict: 'new', reasoning: 'No verdict returned for this index' } };
    }
    return {
      ...c,
      _dedup: {
        verdict: v.verdict,
        duplicate_of_queue_id: v.duplicate_of_queue_id || null,
        reasoning: v.reasoning || '',
      },
    };
  });

  const newCount = annotated.filter((c) => c._dedup.verdict === 'new').length;
  const dupCount = annotated.filter((c) => c._dedup.verdict === 'duplicate').length;
  trace.new_count = newCount;
  trace.duplicate_count = dupCount;
  trace.finished_at = new Date().toISOString();

  return { candidates: annotated, trace };
}

module.exports = { deduplicateCandidates };
