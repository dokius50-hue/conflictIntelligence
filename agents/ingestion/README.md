# Ingestion Agents (Phase 3 Step 2) — Implemented

Run: `npm run ingest:agent` or `node agents/ingestion/orchestrator.js`

## Flags

- `--dry-run` — Log results but don't insert into DB
- `--conflict-id=X` — Override `CONFLICT_ID` env var
- `--dedup-hours=N` — Lookback window for dedup (default 48; increase for slow-moving conflicts)

## Pipeline

1. **Config load** — theatres, actors, locations from Supabase for the conflict
2. **Theatre-searcher** — Parallel Perplexity Sonar calls, one per theatre. Config-driven prompts (no hardcoded per-conflict prompts). Reuses `scripts/lib/sanitize.js` + `validate.js` + Zod schemas.
3. **Deduplicator** — ONE batched Claude call comparing all candidates against recent queue + published events. Conservative: uncertain = keep as new.
4. **Enricher** — Parallel Perplexity calls (capped at 3 concurrent) per non-duplicate candidate. Sets `corroboration_status`.
5. **Insert** — Into `events_queue` with `processing_mode='agent'`, full `agent_trace` JSONB, `key_findings`, `confidence_reasoning`, `corroboration_status`.

## Files

| File | Purpose |
|---|---|
| `orchestrator.js` | Entry point. Loads config, runs pipeline, inserts results. |
| `theatre-searcher.js` | Config-driven Perplexity search per theatre. |
| `deduplicator.js` | Batched Claude dedup against queue + published events. |
| `enricher.js` | Perplexity corroboration per candidate, bounded concurrency. |
| `validators.js` | Zod schemas for all stage outputs. |
| `../lib/llm.js` | Shared `callPerplexity`, `callClaude`, `callClaudeJSON`, `withConcurrency`. Single retry on 429/5xx. |

## Error handling

- Each stage catches independently; one theatre failing doesn't block others.
- Dedup failure → skip dedup, insert all as new.
- Enricher failure per candidate → `corroboration_status: 'unknown'`.
- All errors recorded in `agent_trace`.
- Consecutive API failure counter logged (warns when an API is systematically down).

## DB access

All reads/writes go through `lib/db/` (`queue.js`, `config.js`, `events.js`). The orchestrator uses `insertQueueEvent()` from `lib/db/queue.js` — no direct Supabase calls in agent code except for `getAutoApproveEligible` (which requires the supabase client).

## Cost

Per run for `hormuz_2026` (2 theatres): ~2 Perplexity (search) + 1 Claude (dedup) + 3–8 Perplexity (enrichment) = **6–11 API calls**.

## Old scripts

`scripts/ingest-perplexity.js` is preserved as fallback (`npm run ingest:perplexity`). Note: its prompts are hardcoded per `CONFLICT_ID`. The agent pipeline's config-driven prompts supersede this; when stable, the old script can be retired.
