/**
 * Option-analyst agent. Focuses exclusively on option menu impacts:
 * which options are executed, degraded, foreclosed, or unlocked by this event.
 * Receives pre-assembled context (no DB calls). Returns structured suggestions.
 */
const { callClaude } = require('../lib/llm');

function buildOptionPrompt(eventRecord, optionsContext, recentEventsContext) {
  const eventText = JSON.stringify({
    title: eventRecord.title,
    description: eventRecord.description,
    theatres: eventRecord.theatres,
    actors: eventRecord.actors,
    confidence: eventRecord.confidence,
    escalation_direction: eventRecord.escalation_direction,
    escalation_intensity: eventRecord.escalation_intensity,
    key_findings: eventRecord.key_findings,
  }, null, 1);

  const optionsText = optionsContext
    .map((o) => `[${o.id}] ${o.label} | actor=${o.actor_id} status=${o.status} intensity=${o.intensity} escalation=${o.escalation_direction}${o.prerequisites?.length ? ' prereqs=' + o.prerequisites.join(',') : ''}`)
    .join('\n') || '(none)';

  const recentText = recentEventsContext
    .slice(0, 15)
    .map((e) => `${e.reported_at} ${e.title} theatres=${(e.theatres || []).join(',')}`)
    .join('\n') || '(none)';

  return `You are an option-menu analyst for a conflict intelligence system.
Your ONLY job: determine how this event affects the option space for each actor.

CURRENT OPTIONS (by actor):
${optionsText}

RECENT EVENTS (last 72h, for pattern context):
${recentText}

EVENT TO ANALYSE:
${eventText}

For each option affected, classify the impact:
- "executed": actor has clearly carried out this option
- "degraded": option still available but weakened (harder to execute, less effective)
- "foreclosed": option is no longer viable (prerequisite destroyed, window closed)
- "unlocked": option was previously locked/unavailable but is now viable

Rules:
- Only use option IDs from the list above
- Be conservative: if uncertain between degraded and foreclosed, choose degraded
- Most events affect 0-2 options. Suggesting many is a sign of over-tagging.
- An event can affect options of MULTIPLE actors (e.g. Iran acting forecloses a US option)

Return JSON only:
{"options_executed":[],"options_degraded":[],"options_foreclosed":[],"options_unlocked":[],"reasoning":"one sentence — the single most important option-space judgment"}

No preamble. No fences.`;
}

async function analyseOptions(eventRecord, optionsContext, recentEventsContext) {
  const trace = { stage: 'option-analyst', started_at: new Date().toISOString() };

  const prompt = buildOptionPrompt(eventRecord, optionsContext, recentEventsContext);
  trace.prompt_length = prompt.length;

  let raw;
  try {
    raw = await callClaude(prompt, { maxTokens: 512 });
  } catch (err) {
    trace.error = err.message;
    trace.finished_at = new Date().toISOString();
    return { suggestions: emptyResult('Claude error'), trace };
  }

  if (!raw) {
    trace.note = 'No response (API key missing)';
    trace.finished_at = new Date().toISOString();
    return { suggestions: emptyResult('No API key'), trace };
  }

  try {
    const cleaned = raw.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(cleaned);
    trace.finished_at = new Date().toISOString();
    return {
      suggestions: {
        options_executed: parsed.options_executed || [],
        options_degraded: parsed.options_degraded || [],
        options_foreclosed: parsed.options_foreclosed || [],
        options_unlocked: parsed.options_unlocked || [],
        reasoning: parsed.reasoning || '',
      },
      trace,
    };
  } catch (err) {
    trace.parse_error = err.message;
    trace.finished_at = new Date().toISOString();
    return { suggestions: emptyResult('Parse failed'), trace };
  }
}

function emptyResult(reasoning) {
  return { options_executed: [], options_degraded: [], options_foreclosed: [], options_unlocked: [], reasoning };
}

module.exports = { analyseOptions };
