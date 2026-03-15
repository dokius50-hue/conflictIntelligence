/**
 * Enricher agent. One Perplexity Sonar call per non-duplicate candidate
 * to find corroborating URLs from different publications.
 * Sets corroboration_status: single_source | multi_corroborating | multi_divergent | unknown.
 * Uses bounded concurrency (default 3) to avoid rate limits with large batches.
 * Failure per candidate → corroboration_status: 'unknown', pipeline continues.
 */
const { callPerplexity, withConcurrency } = require('../lib/llm');
const { enrichmentResultSchema } = require('./validators');

const ENRICHMENT_CONCURRENCY = 3;

function buildEnrichmentPrompt(candidate) {
  return `You are a source corroboration agent. Given this event, search for additional reporting from DIFFERENT publications that either confirms or contradicts it.

Event title: ${candidate.title}
Event description: ${candidate.description}
Original source: ${candidate.source_name} — ${candidate.source_url}
Reported at: ${candidate.reported_at}
Theatre(s): ${(candidate.theatres || []).join(', ')}

Find 1-3 URLs from different publications reporting on the same incident.
Then assess corroboration:
- "multi_corroborating" — 2+ independent sources agree on the core facts
- "multi_divergent" — 2+ sources but they disagree on key details
- "single_source" — only the original source found, no independent confirmation

Return a JSON object (not array):
{"corroboration_status": "multi_corroborating|multi_divergent|single_source", "corroborating_urls": ["url1", "url2"], "reasoning": "brief explanation"}

Return ONLY the JSON object. No preamble.`;
}

/**
 * Enrich a single candidate with corroboration data.
 * Returns the candidate with corroboration_status, corroborating_urls, and trace added.
 */
async function enrichSingle(candidate) {
  const trace = {
    stage: 'enricher',
    title: candidate.title,
    started_at: new Date().toISOString(),
  };

  const prompt = buildEnrichmentPrompt(candidate);
  let rawContent;
  try {
    rawContent = await callPerplexity(prompt, { maxTokens: 1024 });
  } catch (err) {
    trace.error = err.message;
    trace.finished_at = new Date().toISOString();
    return {
      ...candidate,
      corroboration_status: 'unknown',
      _enrichment: { corroborating_urls: [], reasoning: `API error: ${err.message}` },
      _enrichment_trace: trace,
    };
  }

  if (!rawContent) {
    trace.note = 'No content returned';
    trace.finished_at = new Date().toISOString();
    return {
      ...candidate,
      corroboration_status: 'unknown',
      _enrichment: { corroborating_urls: [], reasoning: 'No Perplexity response' },
      _enrichment_trace: trace,
    };
  }

  try {
    let cleaned = rawContent.trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
    const parsed = JSON.parse(cleaned);
    const result = enrichmentResultSchema.safeParse(parsed);

    if (result.success) {
      trace.corroboration_status = result.data.corroboration_status;
      trace.url_count = result.data.corroborating_urls.length;
      trace.finished_at = new Date().toISOString();
      return {
        ...candidate,
        corroboration_status: result.data.corroboration_status,
        _enrichment: {
          corroborating_urls: result.data.corroborating_urls,
          reasoning: result.data.reasoning,
        },
        _enrichment_trace: trace,
      };
    }

    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    trace.validation_error = issues;
  } catch (err) {
    trace.parse_error = err.message;
  }

  trace.finished_at = new Date().toISOString();
  return {
    ...candidate,
    corroboration_status: 'unknown',
    _enrichment: { corroborating_urls: [], reasoning: 'Parse/validation failed' },
    _enrichment_trace: trace,
  };
}

/**
 * Enrich all non-duplicate candidates with concurrency cap.
 * @param {object[]} candidates - annotated candidates from deduplicator (_dedup.verdict present)
 * @returns {{ enriched: object[], trace }}
 */
async function enrichCandidates(candidates) {
  const trace = {
    stage: 'enricher-batch',
    total_candidates: candidates.length,
    started_at: new Date().toISOString(),
  };

  const toEnrich = candidates.filter((c) => c._dedup?.verdict !== 'duplicate');
  const duplicates = candidates.filter((c) => c._dedup?.verdict === 'duplicate');
  trace.to_enrich = toEnrich.length;
  trace.skipped_duplicates = duplicates.length;

  if (toEnrich.length === 0) {
    trace.note = 'No non-duplicate candidates to enrich';
    trace.finished_at = new Date().toISOString();
    return { enriched: [], duplicates, trace };
  }

  const results = await withConcurrency(toEnrich, enrichSingle, ENRICHMENT_CONCURRENCY);

  const enriched = [];
  let succeeded = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      enriched.push(r.value);
      succeeded++;
    } else {
      failed++;
      trace.errors = trace.errors || [];
      trace.errors.push(r.reason?.message || String(r.reason));
    }
  }

  trace.succeeded = succeeded;
  trace.failed = failed;
  trace.finished_at = new Date().toISOString();

  return { enriched, duplicates, trace };
}

module.exports = { enrichCandidates, enrichSingle };
