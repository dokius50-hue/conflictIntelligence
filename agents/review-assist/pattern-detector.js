/**
 * Evaluates whether this event fits or breaks recent patterns (escalation direction, actor behaviour).
 * Pure function: receives context, returns pattern note. No DB calls.
 */
function detectPattern(queueItem, recentEvents) {
  if (!recentEvents || recentEvents.length === 0) {
    return { note: 'No recent events in same theatres to compare.', flags: [] };
  }
  const directions = recentEvents
    .map((e) => e.escalation_direction)
    .filter((d) => d && d !== 'ambiguous' && d !== 'neutral');
  const escalatory = directions.filter((d) => d === 'escalatory').length;
  const deescalatory = directions.filter((d) => d === 'de-escalatory').length;
  const eventDir = queueItem.escalation_direction;
  const actorIds = (queueItem.actors || []).map((a) => (typeof a === 'object' ? a.id : a));
  const recentActorCounts = {};
  for (const e of recentEvents) {
    for (const a of e.actors || []) {
      const id = typeof a === 'object' ? a.id : a;
      recentActorCounts[id] = (recentActorCounts[id] || 0) + 1;
    }
  }
  const flags = [];
  let note = '';
  if (eventDir === 'escalatory' && escalatory > deescalatory) {
    note = 'Fits recent trend: escalation continues.';
  } else if (eventDir === 'escalatory' && deescalatory > escalatory) {
    note = 'Breaks pattern: escalation after de-escalatory events.';
    flags.push('direction_shift');
  } else if (eventDir === 'de-escalatory' && deescalatory > escalatory) {
    note = 'Fits recent trend: de-escalation continues.';
  } else if (eventDir === 'de-escalatory' && escalatory > deescalatory) {
    note = 'Breaks pattern: de-escalation after escalatory events.';
    flags.push('direction_shift');
  } else {
    note = `Recent: ${escalatory} escalatory, ${deescalatory} de-escalatory.`;
  }
  const newActors = actorIds.filter((id) => !recentActorCounts[id] || recentActorCounts[id] < 2);
  if (newActors.length > 0 && actorIds.length > 0) {
    flags.push('new_actor_in_theatre');
  }
  return { note, flags };
}

module.exports = { detectPattern };
