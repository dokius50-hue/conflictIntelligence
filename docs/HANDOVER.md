# Handover — Conflict Intelligence

Use this doc to pick up work after a break or in a new session. It summarizes where we are, what’s next, known issues, and learnings.

---

## Where we are

- **Stages 1–5:** Done. Schema (Supabase migrations applied), seed (hormuz_2026, actors, theatres, sources), ingestion (Perplexity via Sonar API, Twitter via RapidAPI), `lib/db`, `lib/reasoning`, agents READMEs.
- **Stage 6:** Done. Event queue (list, approve, reject + Edit & Approve modal with AI tags), tweet queue (API + TweetQueue UI), config editor (actors/theatres with validate_config_references warnings), Twitter RapidAPI client (two-step rest_id flow), admin auth (ADMIN_API_KEY Bearer token).
- **Stage 7:** Done. All seven analytical views built and browser-tested:
  - B1: Situation Map (Leaflet, OSM tiles, theatre rectangles, location markers)
  - B2: Map–Timeline interaction (click theatre/location → filter timeline; click event → highlight on map)
  - B3: Option Elimination View (residual option space per actor, intensity dots, executed/locked/available sections)
  - B4: Threshold Proximity Tracker (condition checklist, proximity bar, cascade consequences)
  - B5: Scenario Falsification Tracker (viable/falsified split, survival conditions)
  - B6: Analyst Perspectives Panel (theatre filter, osint/analyst badges, tweet cards)
  - B7: Market Panel (Recharts line charts, 4 indicators with time-series)
- **Supabase data seeded for all views:** config_locations (7), config_options (13), config_thresholds (3), config_threshold_conditions (10), config_scenarios (4), config_scenario_conditions (12), perspectives (5), market_indicators (4), market_snapshots (4), market_snapshot_values (16), events (10 published).

**Plans to follow:**

- **Stage 6/7 continuation** — Plan name: "Stage 6 and 7 continuation". Cursor may store it under `~/.cursor/plans/` or project `.cursor/plans/` (e.g. `stage_6_and_7_continuation_f46632b3.plan.md`). Covers: A1 event card, A2 Twitter + tweet queue, A3 config editor, B1–B7 map and analytical views.
- **Twitter** — Plan name: "Twitter241 RapidAPI integration" (e.g. `twitter241_rapidapi_integration_4737315a.plan.md`). Use RapidAPI twitter241; implement `fetchViaRapidAPI` in `scripts/lib/twitter-client.js`; env `TWITTER_API_MODE=rapidapi` and `RAPIDAPI_KEY`.

---

## Foreseeable issues and mitigations

| Issue | Mitigation |
|-------|------------|
| **Twitter241 API** — Auth failures, inaccurate fetch, param quirks (per plan note). | Confirm “Get User Tweets” path and response shape in RapidAPI playground before locking the mapper. Handle missing/weird fields; log failures; return `[]` or partial so ingest doesn’t crash. |
| **Map bounds empty** — Theatres seed has no `bounds_north/south/east/west`. | In map component, if theatre bounds are null/empty, use a default Gulf view (e.g. center + zoom on Strait of Hormuz). |
| **Locations not in config API** — Map needs `config_locations`. | Extend `GET /api/config` (or add `GET /api/locations`) to include locations for the conflict. |
| **Edit & Approve** — Editor could enter invalid option/condition IDs. | When building the edit form, load valid option IDs and threshold-condition IDs (from config API or small endpoint) and use them for dropdowns/multiselects so only valid IDs are submitted. |
| **Config editor** — Options/thresholds have array refs (`prerequisites`, `forecloses`, `falsifies_scenario_ids`). | Call `validate_config_references` RPC after save and show dangles as warnings. Start with actors/theatres only; add options/thresholds later with that validation. |
| **RapidAPI rate limits / errors** | In `fetchViaRapidAPI`, catch errors, log to `logs/raw` or `logs/failed`, return `[]` or partial results. |

---

## Learnings and decisions (from README and sessions)

- **Product:** The product is the structured situation model (options, thresholds, scenarios, events), not the feed. Human approves everything that touches published tables; AI only suggests (tags, dispositions).
- **One event per occurrence:** If multiple queue items describe the same real event, approve one and reject the rest as duplicates. (Future: AI “possible duplicate” suggestions to help.)
- **Duplicate detection (future):** AI tagging can suggest `possible_duplicates: [event_id]` using recent approved events so the editor can compare and reject duplicates quickly.
- **Perplexity:** We use Sonar API: endpoint `https://api.perplexity.ai/v1/sonar`, model `sonar` (not the old llama-3.1-sonar-small-128k-online).
- **Twitter:** Use RapidAPI twitter241; env `TWITTER_API_MODE=rapidapi`, `RAPIDAPI_KEY`; implement only in `scripts/lib/twitter-client.js`; no change to `ingest-twitter.js` or schema.
- **Admin auth:** Backend holds Supabase service key; frontend never sees it. All admin actions go through `/api/*`. Optional: set `ADMIN_API_KEY` (server) and `VITE_ADMIN_API_KEY` (frontend) to the same value; admin routes then require `Authorization: Bearer <key>` or `x-admin-key`. If unset, requests are allowed (local dev).
- **Conflict ID:** `hormuz_2026`. Env primary (`VITE_CONFLICT_ID`), URL param override for multi-conflict later.
- **Schema:** `events.queue_id` is a first-class column (not metadata). `validate_config_references()` is Postgres RPC; call after config saves; show dangles as inline warnings, not blockers.

---

## How to run

1. **Env** — `.env` must have `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Optional: `CONFLICT_ID`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`; for admin protection: `ADMIN_API_KEY` and `VITE_ADMIN_API_KEY` (same value). For Twitter: `TWITTER_API_MODE=rapidapi`, `RAPIDAPI_KEY`.
2. **Dev servers** — Two terminals: `npm run dev:api` (API on :3001), `npm run dev` (Vite on :5173). Frontend proxies `/api` to :3001.
3. **Ingestion** — `npm run ingest:perplexity` (writes to `events_queue`); `npm run ingest:twitter` (after RapidAPI client is implemented, writes to `tweets_queue` if `config_twitter_accounts` has rows).
4. **App** — http://localhost:5173 (Home, Timeline, Admin Queue).

---

## Next steps

All build sequence stages are complete. The framework is fully functional with real data. Remaining work is polish, expansion, and production readiness:

1. **Real ingestion run** — Run `npm run ingest:perplexity` and `npm run ingest:twitter` to refill the queue with live data; process through the admin queue to populate published events.
2. **Config expansion** — Add more `config_options`, `config_thresholds`, `config_scenarios` as events evolve using the Config Editor.
3. **Production deploy** — Set up Vercel deployment; ensure Supabase RLS policies are correct for anon/service roles; set env vars on Vercel.
4. **Vercel API routes** — The `api/*.js` files follow Vercel serverless format; `server.js` is dev-only. Verify Vercel `vercel.json` rewrites are correct.
5. **Option/threshold marking** — Wire admin queue approval to update option statuses (executed/degraded/foreclosed) and threshold condition statuses via the Edit & Approve modal.
6. **Causal chain view** — Click an event → see which options were executed/foreclosed and which threshold conditions advanced (lib/reasoning/causal-chain.js scaffolded).

---

## Key files

- **Config / schema:** `supabase/migrations/001_initial.sql`, `002_seed_hormuz.sql`
- **Ingestion:** `scripts/ingest-perplexity.js`, `scripts/ingest-twitter.js`, `scripts/lib/twitter-client.js`, `scripts/lib/sanitize.js`, `scripts/lib/validate.js`
- **API:** `api/queue-pending.js`, `api/queue-approve.js`, `api/queue-reject.js`, `api/config.js`, `api/events.js`, `server.js` (local dev)
- **Admin UI:** `src/admin/AdminQueue.jsx`
- **Requirements:** `CONFLICT_INTELLIGENCE_README.md` (architecture, eight rules, schema, build sequence)

---

*Last updated: session handover. Update this file when completing phases or when new learnings or issues come up.*
