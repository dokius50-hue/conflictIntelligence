# Handover — Conflict Intelligence

Use this doc to pick up work after a break or in a new session. It summarizes where we are, what's next, known issues, and learnings.

---

## Where we are — March 2026

**The full build sequence (Stages 1–7 / A1–A3 / B1–B7) is complete.** Phase 3 agent pipeline (Steps 1–3) is done. The app is a functional conflict intelligence platform with real data, all views browser-tested, and an AI agent pipeline for ingestion and tagging.

### Completed stages

- **Stages 1–5:** Schema (Supabase migrations applied), seed (hormuz_2026, actors, theatres, sources), ingestion pipeline (Perplexity via Sonar API, Twitter via RapidAPI), `lib/db`, `lib/reasoning`, agents directory scaffolded.
- **Stage 6 (A1–A3):**
  - A1: Event queue UI — pending cards with raw toggle, AI tag suggestions (colour-coded badges), Edit & Approve modal (inline field editing, valid option/threshold IDs loaded from config).
  - A2: Twitter RapidAPI client (`scripts/lib/twitter-client.js`) — two-step flow (username → rest_id → tweets), GraphQL-style nested JSON extractor. Tweet queue API (`/api/tweets-pending`, `/api/tweet-disposition`) and TweetQueue admin page.
  - A3: Config editor — actor and theatre admin pages with inline editing, `validate_config_references` warnings after save.
  - Admin auth: `ADMIN_API_KEY` / `VITE_ADMIN_API_KEY` Bearer token protecting all admin routes. Unset = allow (local dev).
- **Stage 7 (B1–B7):** All analytical views built, data seeded, and browser-verified:
  - **B1 Situation Map** — Leaflet + react-leaflet, OSM tiles, theatre rectangles (with real bounds), location markers (7 Gulf/Red Sea sites).
  - **B2 Map–Timeline interaction** — click theatre → filter timeline; click location → filter timeline; click event → highlight location/theatre on map. Active filter chip + clear button.
  - **B3 Option Elimination View** — residual option space per actor (Iran/USA/GCC), intensity dots (1–5), executed/degraded/available/locked sections, prerequisite chain display.
  - **B4 Threshold Proximity Tracker** — proximity bar per threshold, condition checklist (met/unmet/n/a), "watch" callout for next unmet condition, cascade consequences collapsible.
  - **B5 Scenario Falsification Tracker** — viable/falsified split, survival condition checklist, falsification reason box on violated scenarios.
  - **B6 Analyst Perspectives Panel** — theatre filter (All/Gulf/Red Sea), osint/analyst type badges, tweet cards with source links.
  - **B7 Market Panel** — Recharts line charts, 4 indicators (Brent Crude, Suezmax tanker rate, war risk insurance, EU gas) with 4 time-series snapshots from baseline (Mar 1) to current (Mar 12).
- **Phase 3 — Agent Pipeline (Steps 1–3 complete):**
  - **Step 1: Schema migration** — `key_findings`, `confidence_reasoning`, `corroboration_status` on queue tables.
  - **Step 2: Ingestion agents** — Config-driven theatre-searcher → deduplicator → enricher → insert. Run: `npm run ingest:agent`.
  - **Step 3: Tagging agents** — 3-agent swarm (option-analyst, threshold-analyst, cross-theatre) + deterministic synthesis. Triggered on demand via "Suggest Tags (AI)" button in Edit & Approve modal. API: `GET /api/suggest-tags`.
- **Phase 3 — Additional (March 2026):**
  - **Agent trace UI** — `AgentFindings` component in Edit & Approve modal surfaces `key_findings` (structured bullets), `confidence_reasoning`, `corroboration_status`, and expandable raw `agent_trace` JSON. Invisible for non-agent rows.
  - **RLS fix** — `insertQueueEvent` (`lib/db/queue.js`) now uses service role key. Previously used anon key and silently failed — agent pipeline runs before this fix inserted 0 rows.
  - **GitHub Actions** — "Ingest Agent Pipeline" step added to `.github/workflows/ingest.yml`. Runs `ingest:agent` for both conflicts daily alongside existing Perplexity/Twitter steps. Requires `ANTHROPIC_API_KEY` repo secret.

### Supabase data state

| Table | Rows |
|---|---|
| config_conflicts | 2 (hormuz_2026, pak_afg_2025 — see `004_seed_pak_afg.sql`) |
| config_actors | ~6 (iran, usa, gcc, israel, russia, china) |
| config_theatres | 2 (gulf_waters, red_sea) with bounds set |
| config_locations | 7 (Hormuz, Bandar Abbas, Ras Tanura, Fujairah, Abu Musa, Bab el-Mandeb, Jeddah) |
| config_options | 13 (iran×6, usa×4, gcc×3) |
| config_thresholds | 3 (Hormuz closure, US-Iran exchange, Red Sea cutoff) |
| config_threshold_conditions | 10 (across 3 thresholds) |
| config_scenarios | 4 (managed tension, partial closure, direct war, diplomatic resolution) |
| config_scenario_conditions | 12 (across 4 scenarios) |
| config_twitter_accounts | populated with public OSINT accounts |
| events (published) | 10 (5 synthetic with location_id, 5 older from queue) |
| perspectives | 5 (synthetic analyst takes, approved) |
| market_indicators | 4 |
| market_snapshots | 4 (Mar 1, 5, 10, 12) |
| market_snapshot_values | 16 |

---

## How to run

1. **Env** — `.env` must have `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Optional: `CONFLICT_ID`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`. Admin protection: `ADMIN_API_KEY` + `VITE_ADMIN_API_KEY` (same value — if unset, all admin routes are open). Twitter: `TWITTER_API_MODE=rapidapi`, `RAPIDAPI_KEY`.
2. **Dev servers** — Two terminals: `npm run dev:api` (API on :3001), `npm run dev` (Vite on :5173). Or one: `npm run dev:all`. Frontend proxies `/api` to :3001.
   > ⚠️ **`server.js` is a persistent Node process** — it does NOT restart automatically after terminal sessions end or after changes to `api/` or `lib/` files. Always restart it manually: `pkill -f "node server.js" && npm run dev:api`. If you see "Failed to fetch" errors in the browser, the API server has died.
3. **Ingestion** — Three modes:
   - `npm run ingest:perplexity` → `events_queue` (old script, hardcoded prompts per conflict)
   - `npm run ingest:twitter` → `tweets_queue`
   - `npm run ingest:agent` → `events_queue` (agent pipeline, config-driven prompts, dedup + enrichment)
     - Flags: `--dry-run`, `--conflict-id=X`, `--dedup-hours=N`
     - Dry run recommended first: `npm run ingest:agent -- --dry-run`
4. **App** — http://localhost:5173. Nav: Timeline | Map | Options | Thresholds | Scenarios | Perspectives | Market | (admin) Event Queue | Tweet Queue | Config.

---

## Next steps (priority order)

See **`docs/NEXT_STEPS.md`** for the full plan. Summary:

1. ~~**Config Editor expansion**~~ — Done.
2. ~~**Connect to Netlify**~~ — Done.
3. ~~**Multi-conflict resilience fix**~~ — Done.
4. **Phase 3 agents** — Pipeline: reduce → structure → link → surface changes.
   - ~~**Step 1:** Schema migration~~ — Done.
   - ~~**Step 2:** Ingestion agents~~ — Done.
   - ~~**Step 3:** Tagging agents~~ — Done.
   - **Step 4:** Delta view — **NEXT TO IMPLEMENT.** "What changed since last review?" See `docs/NEXT_STEPS.md`.
   - **Step 5:** Gap detection — "What's absent?"
5. ~~**Agent trace in admin UI**~~ — Done. `AgentFindings` component in Edit & Approve modal.
6. ~~**Add `npm run ingest:agent` to GitHub Actions**~~ — Done. Step added to `.github/workflows/ingest.yml`. Add `ANTHROPIC_API_KEY` repo secret to activate.

---

## Key files

| Purpose | File |
|---|---|
| Schema source of truth | `supabase/migrations/001_initial.sql`, `002_seed_hormuz.sql`, `005_agent_schema.sql` |
| API server (dev) | `server.js` (21 routes, 10 admin-auth-protected) |
| Admin auth | `api/lib/adminAuth.js` |
| Ingestion (old scripts) | `scripts/ingest-perplexity.js`, `scripts/ingest-twitter.js` |
| Ingestion (agent pipeline) | `agents/ingestion/orchestrator.js`, `theatre-searcher.js`, `deduplicator.js`, `enricher.js`, `validators.js` |
| Shared LLM caller | `agents/lib/llm.js` (retry, failure tracking, bounded concurrency) |
| Tagging agent swarm | `agents/tagging/orchestrator.js`, `option-analyst.js`, `threshold-analyst.js`, `cross-theatre.js`, `synthesis.js` |
| Tagging API endpoint | `api/suggest-tags.js` |
| Twitter client | `scripts/lib/twitter-client.js` |
| DB query tools | `lib/db/` (events, options, thresholds, scenarios, perspectives, config, queue, market) |
| Reasoning functions | `lib/reasoning/` (options, thresholds, scenarios, causal-chain) |
| API endpoints | `api/` (events, options, thresholds, scenarios, perspectives, market, config, queue-*, tweets-*, config-*, causal-chain, validate-config, review-assist, suggest-tags, conflicts) |
| React hooks | `src/hooks/` (useEvents, useOptions, useThresholds, useScenarios, usePerspectives, useMarket, useConfig, useCausalChain) |
| Pages | `src/pages/` (EventTimeline, TimelinePage, MapWithTimeline, SituationMap, OptionView, ThresholdView, ScenarioView, PerspectivesView, MarketView, Home) |
| Admin pages | `src/admin/` (AdminQueue, TweetQueue, ConfigEditor) |
| Components | `src/components/` (Layout, CausalChainPanel) |
| Conflict context | `src/contexts/ConflictContext.jsx` |
| Netlify | `netlify.toml`, `netlify/functions/api.js` (21 routes) |
| Old suggest-tags (fallback) | `scripts/lib/suggest-tags.js`, `scripts/lib/build-tagging-context.js`, `scripts/lib/tagging-prompts/v1.js` |
| Sanitize/validate | `scripts/lib/sanitize.js`, `scripts/lib/validate.js` |
| Next steps | `docs/NEXT_STEPS.md` |
| Architecture | `CONFLICT_INTELLIGENCE_README.md` |

---

## Learnings and decisions

- **Product:** The product is the structured situation model (options, thresholds, scenarios, events), not a news feed. Human approves everything that touches published tables; AI only suggests (tags, dispositions). Never collapse the review layer.
- **Eight rules:** Components never fetch Supabase directly, components never contain analytical logic, reasoning functions are pure, nothing reaches published tables without human approval, schema changes require migration files, config lives in Supabase not git, every function has an analytical judgment comment, when in doubt do less. Run `grep -r "supabase" src/components/ src/pages/` periodically — zero results required.
- **Leaflet in Vite:** Must import marker PNG images explicitly (`import markerIcon from 'leaflet/dist/images/marker-icon.png'`) and set them via `L.Icon.Default.mergeOptions`. Never pass `icon={undefined}` to a `<Marker>` — it crashes Leaflet. Spread conditionally: `const props = isActive ? { icon: activeIcon } : {}; <Marker {...props} />`.
- **`config_theatres` has no `is_active` column** — don't filter on it. Theatres are always active in the current schema.
- **`config_threshold_conditions` has no `conflict_id`** — conditions are linked to thresholds by `threshold_id` only. Query conditions by `threshold_id[]`, not by conflict.
- **`config_scenario_conditions` has no `conflict_id`** — same pattern as threshold conditions.
- **Twitter RapidAPI (twitter241):** Two-step flow: `GET /user?username=<handle>` → parse `result.data.user.result.rest_id` → `GET /user-tweets?user=<rest_id>&count=20`. Pass `since_id` as query param when present to avoid re-fetching the same 20 tweets. Response is GraphQL-style nested JSON; tweets live in `result.timeline.instructions[*].entries[*].content.itemContent.tweet_results.result`. Protected accounts return empty timelines silently. Use known public OSINT accounts: `wartranslated`, `GeoConfirmed`, `NLwartracker`, `sentdefender`.
- **Perplexity:** Use `https://api.perplexity.ai/chat/completions` (not `/v1/sonar`). Model `sonar`. Hallucination is systematic — URL required for approval, raw toggle one click away in admin queue.
- **Admin auth:** `ADMIN_API_KEY` env var on server, `VITE_ADMIN_API_KEY` on client (same value). If unset, all admin routes are open (safe for local dev). Use `Authorization: Bearer <key>` or `x-admin-key` header. On Netlify, each admin handler must call `requireAdminAuth(req, res)` at the start (no central middleware).
- **Conflict ID:** `hormuz_2026`. Primary via `VITE_CONFLICT_ID` env; URL param `?conflict_id=` overrides for multi-conflict. Resolution order: URL param → `VITE_CONFLICT_ID` → `hormuz_2026`.
- **React Router v6:** `useSearchParams`, `useNavigate`, `useLocation` must be used inside a component rendered within `<Routes>`, not as parents of `Routes`. Use a layout route (`Route element={<LayoutWithProvider />}` with `<Outlet />`) so providers live inside the Routes tree.
- **Schema:** `events.queue_id` is a first-class column (not in metadata). `validate_config_references()` is a Postgres RPC — call after every config save and surface dangles as non-blocking inline warnings.
- **Recharts peer deps:** Install with `--legacy-peer-deps` if React 18 conflicts arise (react-leaflet@4 also requires this).
- **API server restarts:** `server.js` is a persistent Node process — must be restarted (`pkill -f "node server.js"`) after changes to `api/` files or `lib/` files. The Vite dev server hot-reloads automatically.
- **Supabase MCP for seeding:** Use `execute_sql` via MCP for bulk inserts and schema checks. Always verify column names before inserting — several tables lack columns you'd expect (`is_active` on theatres, `conflict_id` on threshold/scenario conditions).
- **Netlify:** Single Express app in `netlify/functions/api.js` wraps all 21 `api/*.js` handlers via `serverless-http`. No changes to handler files needed — they already use Express-style req/res. Admin auth must be enforced inside each admin handler (no central middleware on Netlify). `netlify.toml` defines build, publish dir, function dir, and redirects (API → function, SPA fallback).
- **Config status propagation:** When approving an event, `queue-approve.js` now updates `config_options.status` and `config_threshold_conditions.status`. If all conditions for a threshold become satisfied, `config_thresholds.status = 'crossed'`. On any post-insert failure, the published event is deleted so the queue item stays pending.
- **Vercel AI SDK is ESM-only:** The `ai` npm package uses `import` syntax and cannot be `require()`'d in a CommonJS project (`"type": "commonjs"` in package.json). Decision: use direct `fetch` calls to Perplexity/Claude APIs + Zod for schema validation. This gives structured output validation without CJS/ESM friction.
- **Phase 3 agent design:** Pipeline is "reduce → structure → link → surface changes." Agents are narrow functions (one question each), not services. Every agent output passes through a deterministic validator. Conservative defaults: uncertain → do less. `agent_trace` JSONB on every queue row for observability.
- **`sanitizeEventRecord` strips unknown fields:** The function in `scripts/lib/sanitize.js` returns a fixed set of core event fields. Agent-specific fields (`key_findings`, `confidence_reasoning`) must be carried forward separately after sanitization. The theatre-searcher does this explicitly. If future fields are added to the agent schema, update the theatre-searcher's carry-forward code.
- **Zod schemas must match sanitize output types:** `sanitizeEventRecord` returns `null` for dates when input is invalid (not `undefined`). Zod schemas must use `.nullable()` for any field that could be null from sanitize. `source_url` is required in the Zod schema (not optional with a bad default) because the legacy validator already rejects records without URLs before Zod runs.
- **Ingestion pipeline: old vs agent:** `scripts/ingest-perplexity.js` has hardcoded prompts per `CONFLICT_ID` (only `hormuz_2026` and `pak_afg_2025`). The agent pipeline (`agents/ingestion/`) builds prompts from config — any conflict with theatres/actors/locations in Supabase works automatically. Both coexist; old script is fallback.
- **Dedup strategy:** Claude judges similarity in ONE batched call (all candidates + recent queue + published items). Conservative: uncertain = keep both. Prefer duplicates over missed events. Dedup window configurable via `--dedup-hours` (default 48h; increase for slow-moving conflicts).
- **Enricher strategy:** One Perplexity Sonar call per candidate to find corroborating URLs. Bounded concurrency (3 simultaneous calls). Sets `corroboration_status`. Failure = `unknown`.
- **Tagging swarm design:** 3 specialised agents (option-analyst, threshold-analyst, cross-theatre) run in parallel, then a deterministic synthesis step merges and validates. Sub-agents are pure: they receive pre-assembled context, return structured tags. No DB calls in agents — orchestrator loads all context from `lib/db/`. Synthesis strips hallucinated IDs (only config-valid IDs pass), removes contradictions (option can't be executed AND foreclosed), and combines reasoning from all agents.
- **Tagging is on-demand, not automatic:** Analyst clicks "Suggest Tags (AI)" in the Edit & Approve modal. This avoids unnecessary API costs and keeps the analyst in control. Results auto-populate tag selection fields but can be manually adjusted before approval.

---

*Last updated: March 15, 2026 — Agent trace UI added (AgentFindings component in Edit & Approve modal). RLS bug fixed in insertQueueEvent (was silently inserting 0 rows). First successful full pipeline run: 6 events + 41 tweets. GitHub Actions updated with Ingest Agent Pipeline step. Next: Step 4 (delta view). Requires ANTHROPIC_API_KEY repo secret to activate scheduled agent ingestion. See docs/NEXT_STEPS.md.*
