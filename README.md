# Conflict Intelligence

Structured situation model for live geopolitical crises. See [CONFLICT_INTELLIGENCE_README.md](CONFLICT_INTELLIGENCE_README.md) for full requirements, schema, and build sequence.

## Quick start

1. **Env**  
   Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - Optional: `CONFLICT_ID` (default `hormuz_2026`), `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`, Twitter keys for ingestion.

2. **Database**  
   Create a Supabase project, run migrations in order:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_seed_hormuz.sql`

3. **Install and run**  
   ```bash
   npm install
   npm run dev:api    # Terminal 1: API on :3001
   npm run dev        # Terminal 2: Vite app (proxies /api to :3001)
   ```
   Open http://localhost:5173. Admin queue: http://localhost:5173/admin/queue.

4. **Ingestion (optional)**  
   ```bash
   npm run ingest:perplexity   # requires PERPLEXITY_API_KEY
   npm run ingest:twitter      # requires Twitter config + accounts in config_twitter_accounts
   ```

## Project layout

- `api/` — Backend (service key). Used by Vite proxy in dev and by Vercel serverless in production.
- `lib/db/` — Query tool functions (used by scripts and API).
- `lib/reasoning/` — Pure analytical functions (no DB).
- `scripts/` — Ingestion and tagging (Perplexity, Twitter, suggest-tags).
- `src/` — React app (hooks → fetch `/api/*`; no Supabase in frontend).
- `agents/` — Phase 3 agent READMEs (no code stubs).
- `supabase/migrations/` — Schema source of truth.
