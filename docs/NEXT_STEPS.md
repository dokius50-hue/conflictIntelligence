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

## Phase 3 — Agent Pipeline (Steps 1–3 complete)

**Goal:** Help a seasoned analyst keep up with complex, fast-moving situations. Reduce cognitive overload. Pipeline: **reduce → structure → link → surface changes.**

**Design decisions (March 2026):**

- **No Vercel AI SDK** — ESM-only, incompatible with CJS project. Use direct `fetch` to Perplexity/Claude APIs (same pattern as `ingest-perplexity.js` and `suggest-tags.js`).
- **Zod** for schema validation of all agent outputs (`npm install zod` — already installed).
- LLMs: Perplexity Sonar for search/extraction, Claude for reasoning/dedup/tagging.
- Tagging: on demand (when admin clicks "Suggest Tags (AI)" in Edit & Approve modal), not during ingestion.
- Schema changes via migration file (`005_agent_schema.sql`) — done.
- Agents are narrow functions, not services. Orchestrator calls them in sequence or parallel.
- Every agent output passes through a deterministic Zod validator before entering the pipeline.
- Conservative defaults: uncertain → do less, not more. Empty tags > wrong tags.
- Human stays in the loop: agents fill the queue, humans approve.
- `agent_trace` (JSONB) on every queue row for observability.
- Shared LLM caller (`agents/lib/llm.js`) with single retry on 429/5xx and failure counter tracking.
- Bounded concurrency (`withConcurrency`) for parallel API calls to avoid rate limits.

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
  │   ├─ Carry forward key_findings + confidence_reasoning from raw LLM output
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

**Files:** `agents/lib/llm.js`, `agents/ingestion/` (orchestrator, theatre-searcher, deduplicator, enricher, validators). Modified: `lib/db/queue.js` (added `getRecentQueueEvents`, `insertQueueEvent`), `package.json` (zod, ingest:agent script).

**Cost per run (hormuz_2026, 2 theatres):** ~2 Perplexity (search) + 1 Claude (dedup) + 3–8 Perplexity (enrichment) = **6–11 API calls total**.

**Known issue fixed:** `sanitizeEventRecord()` strips unknown fields. Theatre-searcher explicitly carries forward `key_findings` and `confidence_reasoning` from raw LLM output after sanitization. If new agent fields are added to the schema, update the carry-forward code in `theatre-searcher.js`.

#### ~~Step 3: Tagging agents (on demand)~~ (done)

Replaced `scripts/lib/suggest-tags.js` with a 3-agent tagging swarm called on demand from the Edit & Approve modal. "Suggest Tags (AI)" button triggers the swarm; suggestions auto-populate the tag selection fields.

**Agents (3 parallel Claude calls):**

1. **Option-analyst** — Focuses on option menu impacts (executed, degraded, foreclosed, unlocked). Conservative: uncertain between degraded/foreclosed → degraded.
2. **Threshold-analyst** — Focuses on threshold condition impacts. Only suggests conditions not already met.
3. **Cross-theatre** — Second-order effects across theatres. Catches implications a single-theatre prompt misses. Skips for single-theatre conflicts.
4. **Synthesis** — Deterministic (no LLM). Merges outputs, strips hallucinated IDs, removes contradictions, builds combined reasoning.

**Trigger:** "Suggest Tags (AI)" button in Edit & Approve modal. Not automatic — analyst clicks when they want AI input.

**Cost:** 3 Claude calls per invocation (parallel). No Perplexity calls for tagging.

**Files:** `agents/tagging/` (orchestrator, option-analyst, threshold-analyst, cross-theatre, synthesis), `api/suggest-tags.js`. Modified: `server.js`, `netlify/functions/api.js`, `src/admin/AdminQueue.jsx`.

---

## What's next — Priority order

### Step 4: Delta view (future)

"What changed since last review?" Uses existing situation model (options, thresholds, scenarios). Surfaces new events, option/threshold movements, scenario impact since a timestamp.

**Approach ideas:**
- Store last review timestamp per conflict (or per analyst)
- Query events, option changes, threshold changes since timestamp
- Summarise: "3 new events, 1 option executed, Hormuz closure threshold at 70% (was 50%)"
- Could be a dedicated page or a panel on the Home page

### Step 5: Gap detection (future)

"What's absent?" Surface expected-but-missing signals (theatre went quiet, no response to provocation). Requires baseline cadence data built over time.

### ~~Agent trace in admin UI~~ (done)

`AgentFindings` component added to Edit & Approve modal. Shows `key_findings` as structured bullets (type badge + attribution), `confidence_reasoning` and `corroboration_status` as inline badges, and an expandable raw `agent_trace` JSON toggle. Invisible for items ingested by the old pipeline (graceful null-check).

**RLS fix (done):** `insertQueueEvent` in `lib/db/queue.js` now uses `getSupabase({ serviceRole: true })`. Previously used anon key and silently failed to insert — all agent pipeline runs before this fix inserted 0 rows.

### ~~Add agent ingestion to GitHub Actions~~ (done)

"Ingest Agent Pipeline" step added to `.github/workflows/ingest.yml`. Runs `ingest:agent` for both `hormuz_2026` and `pak_afg_2025` after the existing Perplexity and Twitter steps. Both old and new steps run in parallel (keeping old as fallback to compare output quality). Needs `ANTHROPIC_API_KEY` repo secret added in GitHub → Settings → Secrets and variables → Actions.

---

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

**Agent ingestion is ready to add.** To enable: add `ANTHROPIC_API_KEY` repo secret, add step `npm run ingest:agent -- --conflict-id=hormuz_2026` to the workflow. Can run alongside or replace `ingest:perplexity`. Recommend running both in parallel initially to compare output quality.
