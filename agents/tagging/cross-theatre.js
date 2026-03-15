/**
 * Cross-theatre analyst agent. Identifies second-order effects across theatres:
 * an event in one theatre that has implications for actors/options/thresholds
 * in a different theatre. Highest-value addition — catches implications a
 * single-theatre prompt misses.
 */
const { callClaude } = require('../lib/llm');

function buildCrossTheatrePrompt(eventRecord, allTheatres, optionsContext, thresholdsContext, conditionsContext) {
  const eventTheatres = new Set(eventRecord.theatres || []);
  const otherTheatres = allTheatres.filter((t) => !eventTheatres.has(t.id));

  if (otherTheatres.length === 0) {
    return null;
  }

  const eventText = JSON.stringify({
    title: eventRecord.title,
    description: eventRecord.description,
    theatres: eventRecord.theatres,
    actors: eventRecord.actors,
    key_findings: eventRecord.key_findings,
    escalation_direction: eventRecord.escalation_direction,
  }, null, 1);

  const eventTheatreNames = allTheatres
    .filter((t) => eventTheatres.has(t.id))
    .map((t) => t.label || t.id)
    .join(', ');

  const otherTheatreNames = otherTheatres
    .map((t) => t.label || t.id)
    .join(', ');

  const optionsInOtherTheatres = optionsContext
    .filter((o) => {
      const oTheatres = o.theatre_ids || [];
      return oTheatres.some((tid) => !eventTheatres.has(tid)) || oTheatres.length === 0;
    });

  const optionsText = optionsInOtherTheatres.length > 0
    ? optionsInOtherTheatres.map((o) => `[${o.id}] ${o.label} actor=${o.actor_id} status=${o.status}`).join('\n')
    : optionsContext.map((o) => `[${o.id}] ${o.label} actor=${o.actor_id} status=${o.status}`).join('\n');

  const conditionsText = conditionsContext
    .map((c) => `[${c.id}] ${c.description} status=${c.status}`)
    .join('\n') || '(none)';

  return `You are a cross-theatre analyst for a conflict intelligence system.
Your ONLY job: identify second-order effects this event has on OTHER theatres.

This event occurred in: ${eventTheatreNames}
Other theatres to consider: ${otherTheatreNames}

EVENT:
${eventText}

OPTIONS (including cross-theatre):
${optionsText}

THRESHOLD CONDITIONS:
${conditionsText}

Think about:
- Does this event change what actors CAN do in other theatres?
- Does it signal intent that affects other theatres?
- Does it shift resource allocation that impacts other theatres?
- Does it cross a threshold that cascades to other theatres?

Rules:
- Only flag genuine cross-theatre implications, not the direct theatre impacts
- Be conservative: speculative links are noise, not signal
- Most events have 0 cross-theatre effects. Only flag when genuinely significant.
- Use option/condition IDs from the lists above only

Return JSON only:
{"cross_theatre_flags":["brief description of each cross-theatre implication"],"options_affected":[],"conditions_affected":[],"reasoning":"one sentence — the key cross-theatre insight, if any"}

No preamble. No fences.`;
}

async function analyseCrossTheatre(eventRecord, allTheatres, optionsContext, thresholdsContext, conditionsContext) {
  const trace = { stage: 'cross-theatre', started_at: new Date().toISOString() };

  const prompt = buildCrossTheatrePrompt(eventRecord, allTheatres, optionsContext, thresholdsContext, conditionsContext);

  if (!prompt) {
    trace.note = 'Single-theatre conflict — no cross-theatre analysis needed';
    trace.finished_at = new Date().toISOString();
    return { suggestions: emptyResult('Single-theatre conflict'), trace };
  }

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
        cross_theatre_flags: parsed.cross_theatre_flags || [],
        options_affected: parsed.options_affected || [],
        conditions_affected: parsed.conditions_affected || [],
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
  return { cross_theatre_flags: [], options_affected: [], conditions_affected: [], reasoning };
}

module.exports = { analyseCrossTheatre };
