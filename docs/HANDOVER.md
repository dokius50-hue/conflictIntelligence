# Handover — Conflict Intelligence

Use this doc to pick up work after a break or in a new session. It summarizes where we are, what’s next, known issues, and learnings.

---

## Where we are

- **Stages 1–5:** Done. Schema (Supabase migrations applied), seed (hormuz_2026, actors, theatres, sources), ingestion (Perplexity via Sonar API, Twitter stub), `lib/db`, `lib/reasoning`, agents READMEs.
- **Stage 6 (partial):** Event queue works (list, approve, reject). **Still to do:** event card enhancements (raw toggle, AI tags, Edit & Approve), Twitter RapidAPI implementation, tweet queue API + UI, config editor (actors/theatres first).
- **Stage 7 (partial):** Layout, Home, Event Timeline, Admin Queue. **Still to do:** Situation Map, map–timeline interaction, Option / Threshold / Scenario views, Perspectives panel, Market panel.

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

## Next steps (implementation order from plan)

1. **A1** — Event card: raw input toggle, AI tags display, Edit & Approve (form/modal with valid option/condition IDs).
2. **A2** — Twitter: implement `fetchViaRapidAPI` in `scripts/lib/twitter-client.js` per twitter241 plan; then tweet queue API (`GET /api/tweets-pending`, `POST /api/tweet-disposition`) + admin Tweet queue page.
3. **A3** — Config editor: API for actors/theatres (list, PATCH/POST), call `validate_config_references` on save; admin Config page (actors, theatres).
4. **B1–B7** — Situation Map (Leaflet, OSM/Mapbox), map–timeline interaction, Option/Threshold/Scenario views (APIs + pages), Perspectives panel, Market panel.

---

## Key files

- **Config / schema:** `supabase/migrations/001_initial.sql`, `002_seed_hormuz.sql`
- **Ingestion:** `scripts/ingest-perplexity.js`, `scripts/ingest-twitter.js`, `scripts/lib/twitter-client.js`, `scripts/lib/sanitize.js`, `scripts/lib/validate.js`
- **API:** `api/queue-pending.js`, `api/queue-approve.js`, `api/queue-reject.js`, `api/config.js`, `api/events.js`, `server.js` (local dev)
- **Admin UI:** `src/admin/AdminQueue.jsx`
- **Requirements:** `CONFLICT_INTELLIGENCE_README.md` (architecture, eight rules, schema, build sequence)

---

*Last updated: session handover. Update this file when completing phases or when new learnings or issues come up.*
