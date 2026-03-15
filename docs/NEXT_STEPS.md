# Next Steps — Conflict Intelligence

Use this doc to pick up work in a new session. It lists the remaining tasks in priority order.

---

## Immediate next steps (in order)

### 1. ~~Config Editor expansion~~ (done)

Options and Thresholds tabs added. Analysts can manually correct option status and threshold conditions via Admin → Config.

### 2. ~~Connect to Netlify~~ (done)

Live at [conflictintel.netlify.app](https://conflictintel.netlify.app). For reference, env vars used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ADMIN_API_KEY`, `CONFLICT_ID`, `VITE_CONFLICT_ID`. Optional for ingestion: `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `TWITTER_API_MODE`.

### 3. ~~Multi-conflict UI~~ (done)

**Done:** Option A (URL param). Conflict dropdown in header, `?conflict_id=` in URLs, all hooks and admin pages wired. Second conflict `pak_afg_2025` seeded (`004_seed_pak_afg.sql`). Resilience fix: `ConflictProvider` moved inside Routes via layout route; defensive `conflictId` in Layout, ConfigEditor, Home.

---

## Phase 3 — Agent Pipeline (current priority)

**Goal:** Help a seasoned analyst keep up with complex, fast-moving situations. Reduce cognitive overload. Pipeline: **reduce → structure → link → surface changes.**

**Design decisions (March 2026):**

- **No Vercel AI SDK** — ESM-only, incompatible with CJS project. Use direct `fetch` to Perplexity/Claude APIs (same pattern as `ingest-perplexity.js` and `suggest-tags.js`).
- **Zod** for schema validation of all agent outputs (`npm install zod`).
- LLMs: Perplexity Sonar for search/extraction, Claude for reasoning/dedup.
- Tagging: on demand (when admin opens queue item), not during ingestion.
- Schema changes via migration file (`005_agent_schema.sql`) — done.
- Agents are narrow functions, not services. Orchestrator calls them in sequence.
- Every agent output passes through a deterministic Zod validator before entering the pipeline.
- Conservative defaults: uncertain → do less, not more. Empty tags > wrong tags.
- Human stays in the loop: agents fill the queue, humans approve.
- `agent_trace` (JSONB) on every queue row for observability.

### Implementation order

#### ~~Step 1: Schema migration (`005_agent_schema.sql`)~~ (done)

Applied via Supabase MCP `apply_migration`. Added to `events_queue` and `tweets_queue`:

- `key_findings` — JSONB default `'[]'`, array of `{ finding, attribution, type }` bullets
- `confidence_reasoning` — TEXT nullable, explains why confidence is high/medium/low
- `corroboration_status` — TEXT default `'unknown'`, CHECK constraint: `single_source | multi_corroborating | multi_divergent | unknown`

Verified: existing rows backfilled, ingestion scripts compatible, admin UI graceful, CHECK constraints enforced. Local file: `supabase/migrations/005_agent_schema.sql`.

#### ~~Step 2: Ingestion agents~~ (done)

Replaced `ingest-perplexity.js` with an agent orchestrator. Old scripts stay as fallback. Run: `npm run ingest:agent` (or `node agents/ingestion/orchestrator.js --dry-run --conflict-id=hormuz_2026`).

**Pipeline (implemented):**

```
orchestrator.js (npm run ingest:agent)
  ├─ 1. Load config (theatres, actors, locations for CONFLICT_ID)
  ├─ 2. Generate agent_run_id (crypto.randomUUID())
  ├─ 3. THEATRE-SEARCHER (parallel, 1 per theatre)
  │   ├─ Config-driven prompt (theatre label, location names, valid actor IDs)
  │   ├─ Call Perplexity Sonar → raw JSON events
  │   ├─ Parse (reuse scripts/lib/sanitize.js), validate (scripts/lib/validate.js + Zod)
  │   ├─ Extract key_findings + confidence_reasoning per event
  │   └─ Return candidates[] with agent_trace.search
  ├─ 4. DEDUPLICATOR (1 batched Claude call)
  │   ├─ Load recent queue + published events (configurable window, default 48h)
  │   ├─ ONE Claude call: all candidates + recent events → which are duplicates?
  │   ├─ Conservative: uncertain = keep as new
  │   └─ Write agent_trace.dedup per candidate
  ├─ 5. ENRICHER (parallel, capped concurrency of 3)
  │   ├─ Search for corroborating URLs from different publications
  │   ├─ Set corroboration_status (single_source | multi_corroborating | multi_divergent)
  │   └─ Write agent_trace.enricher
  └─ 6. INSERT into events_queue
      ├─ processing_mode='agent', agent_run_id, full agent_trace
      ├─ key_findings, confidence_reasoning, corroboration_status
      ├─ auto_approve_eligible preserved from config_sources
      └─ Reuse existing sanitize/validate helpers
```

**Files created:**

- `agents/lib/llm.js` — Shared LLM caller. `callPerplexity(prompt)` and `callClaude(prompt)` via direct `fetch`. `callClaudeJSON(prompt, zodSchema)` parses + validates. Single retry on 429/5xx with failure counter tracking. `withConcurrency(items, fn, limit)` for bounded parallelism.
- `agents/ingestion/validators.js` — Zod schemas: `candidateEventSchema`, `dedupResultSchema`, `enrichmentResultSchema`. `validateCandidates(raw)` returns `{ valid[], rejected[] }`.
- `agents/ingestion/theatre-searcher.js` — `searchTheatre(theatre, actors, locations, conflictId)`. Config-driven prompts. Reuses `parseRawEventArray`, `sanitizeEventRecord`. Two-stage validation (legacy + Zod). Returns `{ candidates, rejected, trace }`.
- `agents/ingestion/deduplicator.js` — `deduplicateCandidates(candidates, recentQueue, recentPublished)`. ONE batched Claude call. Checks both queue and published events (published = higher trust). Conservative: validation failure = treat all as new.
- `agents/ingestion/enricher.js` — `enrichCandidates(candidates)`. Bounded concurrency (3). One Perplexity call per non-duplicate candidate. Failure per candidate → `corroboration_status: 'unknown'`.
- `agents/ingestion/orchestrator.js` — Entry point. `--dry-run`, `--conflict-id=X`, `--dedup-hours=N`. Logs trace to `logs/raw/`. Reports API failure counters.

**Files modified:**

- `lib/db/queue.js` — Added `getRecentQueueEvents(conflictId, hours, limit)` and `insertQueueEvent(row)` to centralise DB access.
- `package.json` — Added `zod` dependency, `"ingest:agent"` script.

**Design decisions:**

- Enricher concurrency capped at 3 to avoid Perplexity rate limits with large batches.
- Dedup compares against both queue and published events (published items = confirmed, higher-trust comparisons).
- Dedup window configurable via `--dedup-hours` flag (default 48h; increase for slow-moving conflicts).
- Single retry with backoff on transient API errors (429/5xx). Consecutive failure counter logged so operators know when an API is down.
- `insertQueueEvent` centralised in `lib/db/queue.js` — future column changes only need one update.
- `auto_approve_eligible` preserved using existing `getAutoApproveEligible` from `scripts/lib/validate.js`.
- Old `ingest-perplexity.js` preserved as fallback. Note: its prompts are hardcoded per conflict_id; the agent pipeline's config-driven prompts supersede this.

**Cost per run (hormuz_2026, 2 theatres):** ~2 Perplexity (search) + 1 Claude (dedup) + N Perplexity (enrichment, ~3–8) = **6–11 API calls total**.

#### Step 3: Tagging agents (on demand)

Replace `scripts/lib/suggest-tags.js` with a tagging swarm called when admin opens a queue item:

1. **Option-analyst** — Focused on option menu impacts. Uses `lib/reasoning/options.js` context.
2. **Threshold-analyst** — Focused on threshold condition impacts. Uses `lib/reasoning/thresholds.js` context.
3. **Cross-theatre** — Second-order effects across theatres. Highest-value addition.
4. **Synthesis** — Merges outputs, validates IDs against config, returns `ai_suggested_tags`.

Trigger: API call when Edit & Approve modal opens (alongside existing review-assist).

Key files to create/modify:

- `agents/tagging/orchestrator.js` — Tagging swarm coordinator
- `agents/tagging/option-analyst.js`
- `agents/tagging/threshold-analyst.js`
- `agents/tagging/cross-theatre.js`
- `agents/tagging/synthesis.js`
- `api/suggest-tags.js` — New API endpoint (or extend existing review-assist)
- `src/admin/AdminQueue.jsx` — Wire tagging into Edit & Approve modal

#### Step 4: Delta view (future)

"What changed since last review?" Uses existing situation model (options, thresholds, scenarios). Surfaces new events, option/threshold movements, scenario impact since a timestamp.

#### Step 5: Gap detection (future)

"What's absent?" Surface expected-but-missing signals (theatre went quiet, no response to provocation). Requires baseline cadence data built over time.

### Design principles

- **Narrow agents:** Each answers one question. Orchestrator combines.
- **Deterministic validators:** Code checks every agent output (schema, IDs, enums).
- **Conservative defaults:** Uncertain → do less. Empty tags > wrong tags.
- **Human in the loop:** Agents fill queue; humans approve.
- **Trace everything:** `agent_trace` JSONB on every queue row.
- **Independent stages:** Partial failure is fine; no stage blocks another.
- **No infra complexity:** Single orchestrator script; agents are functions; no message queues.

### Key extraction improvements

- `key_findings` with attribution: analyst sees structured bullets instead of flat description
- `confidence_reasoning`: analyst knows why confidence is high/medium/low
- `corroboration_status`: enricher checks multiple sources; analyst sees agreement/disagreement
- Content classified per item (not per source): same account can post breaking news and analysis
- Event clustering (dedup): analyst sees "1 event, 6 sources" not "6 items to review"

---

## Live ingestion (scheduled)

GitHub Actions runs `npm run ingest:perplexity` and `npm run ingest:twitter` daily at 12:00 UTC. Add repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PERPLEXITY_API_KEY`, `RAPIDAPI_KEY`. Optional repo variable: `CONFLICT_ID` (defaults to `hormuz_2026` if unset). Workflow: `.github/workflows/ingest.yml`. Manual trigger: Actions → Ingest → Run workflow.

Once agent ingestion is ready, add `npm run ingest:agent` to the workflow (alongside or replacing script ingestion).