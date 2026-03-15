# Tagging Agents (Phase 3 Step 3) — Implemented

Triggered on demand from the Edit & Approve modal ("Suggest Tags (AI)" button).

## API

`GET /api/suggest-tags?queue_id=<uuid>&conflict_id=<id>` (admin auth required)

Returns `{ tags, trace }` where `tags` has:
- `options_executed`, `options_degraded`, `options_foreclosed`, `options_unlocked` — option IDs
- `thresholds_advanced` — condition IDs
- `reasoning` — combined reasoning from all agents
- `flags` — cross-theatre implications
- `confidence` — high/medium/low based on how many agents contributed

## Pipeline

3 agents run in parallel (1 Claude call each), then deterministic synthesis:

1. **Option-analyst** — Which options are executed/degraded/foreclosed/unlocked by this event?
2. **Threshold-analyst** — Which threshold conditions does this event advance?
3. **Cross-theatre** — What second-order effects does this event have on other theatres?
4. **Synthesis** — Merges outputs, strips hallucinated IDs (only config-valid IDs pass), removes contradictions (option can't be in multiple categories), builds combined reasoning.

## Files

| File | Purpose |
|---|---|
| `orchestrator.js` | Loads context from lib/db/, runs 3 agents in parallel, synthesises |
| `option-analyst.js` | Option menu impact analysis (1 Claude call) |
| `threshold-analyst.js` | Threshold condition impact analysis (1 Claude call) |
| `cross-theatre.js` | Cross-theatre second-order effects (1 Claude call) |
| `synthesis.js` | Deterministic merge + ID validation (no LLM) |

## Cost

3 Claude calls per invocation (parallel). No Perplexity calls.

## Design

- Sub-agents are pure: they receive pre-assembled context and return structured tags. No DB calls in agents.
- Orchestrator loads all context (options, thresholds, conditions, recent events, theatres) and passes to agents.
- Synthesis validates all IDs against config (strips hallucinated IDs) and removes contradictions.
- Conservative defaults: parse failure → empty tags, API error → empty tags.
- Cross-theatre agent skips analysis for single-theatre conflicts (returns empty).

## UI Integration

"Suggest Tags (AI)" button in the AdminQueue Edit & Approve modal. When clicked:
1. Calls `/api/suggest-tags` with the queue item ID
2. Shows loading state ("Running tag analysis (3 agents)…")
3. On success: auto-applies suggested tags to the selection fields, shows reasoning and cross-theatre flags
4. Analyst can still manually adjust before approving

## Old suggest-tags

`scripts/lib/suggest-tags.js` is preserved as fallback. It uses a single Claude call with a monolithic prompt. The new swarm uses 3 specialised agents for better coverage and the synthesis step for validation.
