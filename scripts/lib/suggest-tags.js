/**
 * Calls Claude API for tag suggestions; validates returned IDs against Supabase; returns suggestions.
 * AI suggests only — human approves in admin UI.
 */
const path = require('path');
const projectRoot = path.resolve(__dirname, '../..');
const { buildTaggingContext } = require('./build-tagging-context');
const { TAGGING_PROMPT_V1 } = require('./tagging-prompts/v1');
const { getOptionsForActors } = require(path.join(projectRoot, 'lib/db/options'));
const { getThresholdConditions } = require(path.join(projectRoot, 'lib/db/thresholds'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Strip hallucinated IDs. Valid IDs loaded from config; only those may be suggested.
 */
function validateSuggestedTags(suggestions, validOptionIds, validConditionIds) {
  return {
    ...suggestions,
    options_executed: (suggestions.options_executed || []).filter((id) => validOptionIds.has(id)),
    options_degraded: (suggestions.options_degraded || []).filter((id) => validOptionIds.has(id)),
    options_foreclosed: (suggestions.options_foreclosed || []).filter((id) => validOptionIds.has(id)),
    options_unlocked: (suggestions.options_unlocked || []).filter((id) => validOptionIds.has(id)),
    thresholds_advanced: (suggestions.thresholds_advanced || []).filter((id) => validConditionIds.has(id)),
  };
}

function formatContextForPrompt(context) {
  const optionsText =
    context.options
      ?.map(
        (o) =>
          `[${o.id}] ${o.label} status=${o.status} escalation=${o.escalation_direction} intensity=${o.intensity}`
      )
      .join('\n') || '(none)';
  const conditionsText =
    context.conditions
      ?.map((c) => `[${c.id}] ${c.description} status=${c.status}`)
      .join('\n') || '(none)';
  const recentText =
    context.recentEvents
      ?.slice(0, 20)
      ?.map((e) => `${e.reported_at} ${e.title} theatres=${(e.theatres || []).join(',')}`)
      .join('\n') || '(none)';
  return { optionsText, conditionsText, recentText };
}

/**
 * Get tag suggestions for a queue event record. Uses buildTaggingContext and Claude.
 * Returns { options_executed, options_degraded, options_foreclosed, options_unlocked, thresholds_advanced, confidence, reasoning, flags } with validated IDs only.
 */
async function suggestTags(eventRecord, conflictId) {
  const context = await buildTaggingContext(eventRecord, conflictId);
  const validOptionIds = new Set((context.options || []).map((o) => o.id));
  const validConditionIds = new Set((context.conditions || []).map((c) => c.id));

  const { optionsText, conditionsText, recentText } = formatContextForPrompt(context);
  const eventText = JSON.stringify(eventRecord, null, 2);
  const prompt = TAGGING_PROMPT_V1.replace('{options_context}', optionsText)
    .replace('{thresholds_context}', conditionsText)
    .replace('{recent_events_context}', recentText)
    .replace('{event_record}', eventText);

  if (!ANTHROPIC_API_KEY) {
    return {
      options_executed: [],
      options_degraded: [],
      options_foreclosed: [],
      options_unlocked: [],
      thresholds_advanced: [],
      confidence: 'medium',
      reasoning: 'AI tagging skipped (no ANTHROPIC_API_KEY).',
      flags: [],
    };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }
  const json = await res.json();
  const text = json?.content?.[0]?.text || '{}';
  const raw = text.replace(/^[\s\S]*?\{/, '{').replace(/\}[\s\S]*$/, '}');
  let suggestions;
  try {
    suggestions = JSON.parse(raw);
  } catch {
    suggestions = { reasoning: 'Parse failed', confidence: 'medium', flags: [] };
  }
  return validateSuggestedTags(suggestions, validOptionIds, validConditionIds);
}

module.exports = {
  suggestTags,
  validateSuggestedTags,
};
