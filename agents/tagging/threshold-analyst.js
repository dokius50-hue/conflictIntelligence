/**
 * Threshold-analyst agent. Focuses exclusively on threshold condition impacts:
 * which conditions are advanced (moved closer to being met) by this event.
 * Receives pre-assembled context (no DB calls). Returns structured suggestions.
 */
const { callClaude } = require('../lib/llm');

function buildThresholdPrompt(eventRecord, thresholdsContext, conditionsContext, recentEventsContext) {
  const eventText = JSON.stringify({
    title: eventRecord.title,
    description: eventRecord.description,
    theatres: eventRecord.theatres,
    actors: eventRecord.actors,
    confidence: eventRecord.confidence,
    escalation_direction: eventRecord.escalation_direction,
    key_findings: eventRecord.key_findings,
  }, null, 1);

  const thresholdsText = thresholdsContext
    .map((t) => `THRESHOLD [${t.id}]: ${t.label} — status=${t.status}`)
    .join('\n') || '(none)';

  const conditionsText = conditionsContext
    .map((c) => `  CONDITION [${c.id}] (threshold=${c.threshold_id}): ${c.description} — status=${c.status}`)
    .join('\n') || '(none)';

  const recentText = recentEventsContext
    .slice(0, 10)
    .map((e) => `${e.reported_at} ${e.title}`)
    .join('\n') || '(none)';

  return `You are a threshold analyst for a conflict intelligence system.
Your ONLY job: determine which threshold conditions this event advances.

A condition is "advanced" if this event provides evidence that the condition is being met
or is closer to being met. Do NOT mark conditions already status=met.

THRESHOLDS:
${thresholdsText}

CONDITIONS:
${conditionsText}

RECENT EVENTS (context):
${recentText}

EVENT TO ANALYSE:
${eventText}

Rules:
- Only use condition IDs from the list above
- Only suggest conditions with status != 'met' (advancing an already-met condition is meaningless)
- Be conservative: the event must clearly relate to the condition's description
- Most events advance 0-1 conditions. Suggesting many is a sign of over-tagging.

Return JSON only:
{"thresholds_advanced":[],"reasoning":"one sentence — how this event moves the threshold picture"}

No preamble. No fences.`;
}

async function analyseThresholds(eventRecord, thresholdsContext, conditionsContext, recentEventsContext) {
  const trace = { stage: 'threshold-analyst', started_at: new Date().toISOString() };

  if (conditionsContext.length === 0) {
    trace.note = 'No conditions to analyse';
    trace.finished_at = new Date().toISOString();
    return { suggestions: { thresholds_advanced: [], reasoning: 'No threshold conditions in scope' }, trace };
  }

  const prompt = buildThresholdPrompt(eventRecord, thresholdsContext, conditionsContext, recentEventsContext);
  trace.prompt_length = prompt.length;

  let raw;
  try {
    raw = await callClaude(prompt, { maxTokens: 512 });
  } catch (err) {
    trace.error = err.message;
    trace.finished_at = new Date().toISOString();
    return { suggestions: { thresholds_advanced: [], reasoning: 'Claude error' }, trace };
  }

  if (!raw) {
    trace.note = 'No response (API key missing)';
    trace.finished_at = new Date().toISOString();
    return { suggestions: { thresholds_advanced: [], reasoning: 'No API key' }, trace };
  }

  try {
    const cleaned = raw.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(cleaned);
    trace.finished_at = new Date().toISOString();
    return {
      suggestions: {
        thresholds_advanced: parsed.thresholds_advanced || [],
        reasoning: parsed.reasoning || '',
      },
      trace,
    };
  } catch (err) {
    trace.parse_error = err.message;
    trace.finished_at = new Date().toISOString();
    return { suggestions: { thresholds_advanced: [], reasoning: 'Parse failed' }, trace };
  }
}

module.exports = { analyseThresholds };
