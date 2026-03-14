# Review-assist agents (Phase 3)

**Implemented.** Runs when an editor opens a queue item (Edit & Approve modal). New capability (no script equivalent).

- **Context-builder** — pulls last 72h published events for the same theatres via `lib/db/events.js` (e.g. `getPublishedEvents({ theatres, limit, sinceHours: 72 })`).
- **Verifier** — fetches source URL, checks key facts in the event record match the page (guards against hallucination).
- **Pattern-detector** — evaluates whether this event fits or breaks recent patterns (escalation direction, actor behaviour). Uses `lib/reasoning/` for option/threshold state if needed; state is loaded by orchestrator from `lib/db/` and `lib/reasoning/`.
- **Orchestrator** — returns a short brief (context summary, verification result, pattern note, flags) for the editor to read before approving/rejecting.

**Tool library:** `lib/db/events.js`, `lib/db/queue.js`, `lib/reasoning/options.js`, `lib/reasoning/thresholds.js`. No writes; read-only assist. Admin backend calls the orchestrator when the editor opens a card; result is displayed inline, not stored in DB (or store in a transient cache keyed by queue item id).
