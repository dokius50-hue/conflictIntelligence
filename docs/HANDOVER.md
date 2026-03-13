# Handover — Conflict Intelligence

Use this doc to pick up work after a break or in a new session. It summarizes where we are, what's next, known issues, and learnings.

---

## Where we are — March 2026

**The full build sequence (Stages 1–7 / A1–A3 / B1–B7) is complete.** The app is a functional conflict intelligence platform with real data, all views browser-tested.

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

### Supabase data state (hormuz_2026)

| Table | Rows |
|---|---|
| config_conflicts | 1 |
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
2. **Dev servers** — Two terminals: `npm run dev:api` (API on :3001), `npm run dev` (Vite on :5173). Frontend proxies `/api` to :3001.
3. **Ingestion** — `npm run ingest:perplexity` → `events_queue`; `npm run ingest:twitter` → `tweets_queue`.
4. **App** — http://localhost:5173. Nav: Timeline | Map | Options | Thresholds | Scenarios | Perspectives | Market | (admin) Event Queue | Tweet Queue | Config.

---

## Next steps (priority order)

1. **Live ingestion cycle** — Run `npm run ingest:perplexity` and `npm run ingest:twitter` to refill queues with current data. Process events through Admin Queue with proper option/threshold tagging — this is the core editorial workflow and should be done regularly.
2. **Option/threshold status updates from queue** — Wire the Edit & Approve modal so approving an event with `options_executed` / `thresholds_advanced` automatically marks those records in Supabase (`config_options.status`, `config_threshold_conditions.status`). Currently the event stores the tag IDs but the config tables aren't updated.
3. **Causal chain view** — Click an event → see cross-actor option effects and which threshold conditions it advanced (`lib/reasoning/causal-chain.js` is scaffolded, `lib/reasoning/options.getOptionChangesFromEvent` exists).
4. **Production deploy** — Vercel deployment. `api/*.js` are already Vercel serverless format. `server.js` is dev-only. Check/write `vercel.json` rewrites. Supabase RLS: anon key for public reads, service key for admin writes (already separated in `api/lib/supabase.js`).
5. **Config expansion** — As events are approved, use Config Editor to mark options as executed/degraded and threshold conditions as met. The analytical views will update in real-time.
6. **Multi-conflict** — Framework is conflict-agnostic. Adding a new conflict: insert `config_conflicts` row, write SQL seed for all `config_*` tables, set `CONFLICT_ID` env var. Zero code changes needed.

---

## Key files

| Purpose | File |
|---|---|
| Schema source of truth | `supabase/migrations/001_initial.sql`, `002_seed_hormuz.sql` |
| API server (dev) | `server.js` |
| Admin auth | `api/lib/adminAuth.js` |
| Ingestion | `scripts/ingest-perplexity.js`, `scripts/ingest-twitter.js` |
| Twitter client | `scripts/lib/twitter-client.js` |
| DB query tools | `lib/db/` (events, options, thresholds, scenarios, perspectives, config, queue, market) |
| Reasoning functions | `lib/reasoning/` (options, thresholds, scenarios, causal-chain) |
| API endpoints | `api/` (events, options, thresholds, scenarios, perspectives, market, config, queue-*, tweets-*, config-*, validate-config) |
| React hooks | `src/hooks/` (useEvents, useOptions, useThresholds, useScenarios, usePerspectives, useMarket, useConfig) |
| Pages | `src/pages/` (EventTimeline, MapWithTimeline, SituationMap, OptionView, ThresholdView, ScenarioView, PerspectivesView, MarketView, Home) |
| Admin pages | `src/admin/` (AdminQueue, TweetQueue, ConfigEditor) |
| Architecture | `CONFLICT_INTELLIGENCE_README.md` |

---

## Learnings and decisions

- **Product:** The product is the structured situation model (options, thresholds, scenarios, events), not a news feed. Human approves everything that touches published tables; AI only suggests (tags, dispositions). Never collapse the review layer.
- **Eight rules:** Components never fetch Supabase directly, components never contain analytical logic, reasoning functions are pure, nothing reaches published tables without human approval, schema changes require migration files, config lives in Supabase not git, every function has an analytical judgment comment, when in doubt do less. Run `grep -r "supabase" src/components/ src/pages/` periodically — zero results required.
- **Leaflet in Vite:** Must import marker PNG images explicitly (`import markerIcon from 'leaflet/dist/images/marker-icon.png'`) and set them via `L.Icon.Default.mergeOptions`. Never pass `icon={undefined}` to a `<Marker>` — it crashes Leaflet. Spread conditionally: `const props = isActive ? { icon: activeIcon } : {}; <Marker {...props} />`.
- **`config_theatres` has no `is_active` column** — don't filter on it. Theatres are always active in the current schema.
- **`config_threshold_conditions` has no `conflict_id`** — conditions are linked to thresholds by `threshold_id` only. Query conditions by `threshold_id[]`, not by conflict.
- **`config_scenario_conditions` has no `conflict_id`** — same pattern as threshold conditions.
- **Twitter RapidAPI (twitter241):** Two-step flow: `GET /user?username=<handle>` → parse `result.data.user.result.rest_id` → `GET /user-tweets?user=<rest_id>&count=20`. Response is GraphQL-style nested JSON; tweets live in `result.timeline.instructions[*].entries[*].content.itemContent.tweet_results.result`. Protected accounts return empty timelines silently. Use known public OSINT accounts: `wartranslated`, `GeoConfirmed`, `NLwartracker`, `sentdefender`.
- **Perplexity:** Sonar API endpoint `https://api.perplexity.ai/v1/sonar`, model `sonar`. Hallucination is systematic — URL required for approval, raw toggle one click away in admin queue.
- **Admin auth:** `ADMIN_API_KEY` env var on server, `VITE_ADMIN_API_KEY` on client (same value). If unset, all admin routes are open (safe for local dev). Use `Authorization: Bearer <key>` or `x-admin-key` header.
- **Conflict ID:** `hormuz_2026`. Primary via `VITE_CONFLICT_ID` env; URL param override for multi-conflict routing later.
- **Schema:** `events.queue_id` is a first-class column (not in metadata). `validate_config_references()` is a Postgres RPC — call after every config save and surface dangles as non-blocking inline warnings.
- **Recharts peer deps:** Install with `--legacy-peer-deps` if React 18 conflicts arise (react-leaflet@4 also requires this).
- **API server restarts:** `server.js` is a persistent Node process — must be restarted (`pkill -f "node server.js"`) after changes to `api/` files or `lib/` files. The Vite dev server hot-reloads automatically.
- **Supabase MCP for seeding:** Use `execute_sql` via MCP for bulk inserts and schema checks. Always verify column names before inserting — several tables lack columns you'd expect (`is_active` on theatres, `conflict_id` on threshold/scenario conditions).

---

*Last updated: March 2026 — all B1–B7 stages complete, full platform functional.*
