/**
 * Shared LLM callers for agent pipeline. Direct fetch to Perplexity/Claude APIs.
 * Single retry on transient errors (429, 5xx). Tracks consecutive failures
 * so the orchestrator can abort early if an API is down.
 */
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const PERPLEXITY_MODEL = 'sonar';

const RETRY_DELAY_MS = 2500;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const failureCounters = { perplexity: 0, claude: 0 };

function getFailureCounters() {
  return { ...failureCounters };
}

function resetFailureCounters() {
  failureCounters.perplexity = 0;
  failureCounters.claude = 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch with a single retry on transient HTTP errors.
 * Returns the Response object. Throws on persistent failure.
 */
async function fetchWithRetry(url, options, provider) {
  let res = await fetch(url, options);
  if (RETRYABLE_STATUSES.has(res.status)) {
    console.warn(`[llm] ${provider} returned ${res.status}, retrying in ${RETRY_DELAY_MS}ms…`);
    await sleep(RETRY_DELAY_MS);
    res = await fetch(url, options);
  }
  if (!res.ok) {
    failureCounters[provider] = (failureCounters[provider] || 0) + 1;
    const body = await res.text();
    throw new Error(`${provider} API ${res.status}: ${body}`);
  }
  failureCounters[provider] = 0;
  return res;
}

/**
 * Call Perplexity Sonar. Returns the text content of the first choice, or null if key missing.
 */
async function callPerplexity(prompt, { maxTokens = 4096 } = {}) {
  if (!PERPLEXITY_API_KEY) {
    console.warn('[llm] PERPLEXITY_API_KEY not set; skipping call.');
    return null;
  }
  const res = await fetchWithRetry(
    PERPLEXITY_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      }),
    },
    'perplexity'
  );
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

/**
 * Call Claude. Returns the raw text content.
 */
async function callClaude(prompt, { maxTokens = 2048, system = undefined } = {}) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[llm] ANTHROPIC_API_KEY not set; skipping call.');
    return null;
  }
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (system) body.system = system;

  const res = await fetchWithRetry(
    CLAUDE_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    },
    'claude'
  );
  const json = await res.json();
  return json?.content?.[0]?.text || null;
}

/**
 * Call Claude and parse response as JSON validated against a Zod schema.
 * Strips markdown fences and leading/trailing text before parsing.
 * Returns { data, raw } on success, throws on validation failure.
 */
async function callClaudeJSON(prompt, zodSchema, options = {}) {
  const raw = await callClaude(prompt, options);
  if (raw == null) return { data: null, raw: null };

  let cleaned = raw.trim();
  const fenceStart = cleaned.indexOf('```');
  if (fenceStart !== -1) {
    const afterOpen = cleaned.indexOf('\n', fenceStart) + 1;
    const fenceEnd = cleaned.indexOf('```', afterOpen);
    cleaned = fenceEnd !== -1
      ? cleaned.slice(afterOpen, fenceEnd).trim()
      : cleaned.slice(afterOpen).trim();
  }

  const jsonStart = cleaned.search(/[\[{]/);
  const jsonEnd = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Claude response contains no JSON: ${cleaned.slice(0, 200)}`);
  }
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

  const parsed = JSON.parse(cleaned);
  const result = zodSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Zod validation failed: ${issues}`);
  }
  return { data: result.data, raw };
}

/**
 * Run async functions with bounded concurrency.
 * Returns array of { status: 'fulfilled'|'rejected', value?, reason? } (same shape as Promise.allSettled).
 */
async function withConcurrency(items, fn, limit = 3) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        const value = await fn(items[idx], idx);
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

module.exports = {
  callPerplexity,
  callClaude,
  callClaudeJSON,
  withConcurrency,
  getFailureCounters,
  resetFailureCounters,
  CLAUDE_MODEL,
  PERPLEXITY_MODEL,
};
