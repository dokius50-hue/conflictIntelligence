# Tagging agents (Phase 3)

When `suggest-tags.js` is replaced by an Agno tagging swarm:

- **Option-analyst** — focuses only on option menu impacts (executed, degraded, foreclosed, unlocked). Uses `lib/reasoning/options.js` (e.g. getResidualOptionSpace) for context; no DB calls from the agent, context is pre-assembled by orchestrator using `lib/db/` and `lib/reasoning/`.
- **Threshold-analyst** — focuses only on threshold condition impacts. Uses `lib/reasoning/thresholds.js` for proximity context.
- **Cross-theatre** — finds second-order effects across theatres. Highest-value addition; catches implications a single broad prompt misses.
- **Synthesis** — merges outputs and returns a single suggested tag set with reasoning.

**Tool library:** Orchestrator calls `lib/db/` to load options, thresholds, recent events; passes data to sub-agents. Sub-agents are pure: they receive context and return structured tag suggestions. ID validation (strip hallucinated IDs) remains in orchestrator using valid option/condition IDs from `lib/db/`.

**Observability:** Store `agent_run_id` and `agent_trace` on `events_queue` (and `tweets_queue` if tagging tweets).
