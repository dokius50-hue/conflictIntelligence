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

- Agno SDK for agent definitions (or best-fit Node.js agent framework if Agno is Python-only); custom orchestrator pattern as fallback.
- LLMs: Perplexity Sonar for search/extraction, Claude for reasoning/tagging.
- Tagging: on demand (when admin opens queue item), not during ingestion.
- Schema changes via migration file (`005_agent_schema.sql`).
- Agents are narrow functions, not services. Orchestrator calls them in sequence.
- Every agent output passes through a deterministic validator before entering the pipeline.
- Conservative defaults: uncertain → do less, not more. Empty tags > wrong tags.
- Human stays in the loop: agents fill the queue, humans approve.
- `agent_trace` (JSONB) on every queue row for observability.

### Implementation order

#### Step 1: Schema migration (`005_agent_schema.sql`)

Add new columns to `events_queue` and `tweets_queue`:

- `key_findings` — JSONB array of `{ finding, attribution, type }` bullets
- `confidence_reasoning` — TEXT explaining why confidence is high/medium/low
- `corroboration_status` — TEXT enum: `single_source | multi_corroborating | multi_divergent | unknown`

These enable richer extraction and enrichment without changing existing columns.

#### Step 2: Ingestion agents

Replace `ingest-perplexity.js` / `ingest-twitter.js` with an agent orchestrator:

1. **Theatre-searcher** (1 per theatre, parallel) — Perplexity Sonar search scoped to theatre; returns candidate events with `key_findings` and `confidence_reasoning`.
2. **Deduplicator** — Compare candidates against recent queue (title + URL + time window + semantic similarity). Uncertain → keep both. Write `agent_trace.dedup` with similarity scores.
3. **Enricher** — Find corroborating URLs for candidates. Set `corroboration_status`. Write `agent_trace.enricher`.
4. **Insert** into `events_queue` with `processing_mode = 'agent'`, `agent_run_id`, `agent_trace`.

Run via `npm run ingest:agent` or GitHub Actions cron.

Key files to create/modify:

- `agents/ingestion/orchestrator.js` — Main pipeline script
- `agents/ingestion/theatre-searcher.js` — Per-theatre extraction agent
- `agents/ingestion/deduplicator.js` — Near-duplicate detection
- `agents/ingestion/enricher.js` — URL corroboration
- `agents/ingestion/validators.js` — Deterministic output validators
- `agents/lib/llm.js` — Shared LLM caller (Perplexity + Claude)
- `supabase/migrations/005_agent_schema.sql` — New columns

Existing scripts stay as fallback (`ingest-perplexity.js`, `ingest-twitter.js`).

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