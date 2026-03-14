# Next Steps — Conflict Intelligence

Use this doc to pick up work in a new session. It lists the remaining tasks in priority order.

---

## Immediate next steps (in order)

### 1. ~~Config Editor expansion~~ (done)

Options and Thresholds tabs added. Analysts can manually correct option status and threshold conditions via Admin → Config.

### 2. ~~Connect to Netlify~~ (done)

Live at [conflictintel.netlify.app](https://conflictintel.netlify.app). For reference, env vars used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ADMIN_API_KEY`, `CONFLICT_ID`, `VITE_CONFLICT_ID`. Optional for ingestion: `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `TWITTER_API_MODE`.

### 3. Multi-conflict UI (implemented; resilience fix pending)

**Done:** Option A (URL param). Conflict dropdown in header, `?conflict_id=` in URLs, all hooks and admin pages wired. Second conflict `pak_afg_2025` seeded (`004_seed_pak_afg.sql`).

**Pending:** Resilience fix — `ConflictProvider` uses `useSearchParams` but is outside `Routes`, which can cause localhost errors. Move provider inside Routes via layout route. See `docs/plans/fix_multi_conflict_resilience.md`.

---

## Future / lower priority

- **Phase 3 agents** — Review-assist implemented (Edit & Approve modal shows context, source verification, pattern note). Ingestion and tagging agents: specs in `agents/ingestion/`, `agents/tagging/`.

## Live ingestion (scheduled)

GitHub Actions runs `npm run ingest:perplexity` and `npm run ingest:twitter` daily at 12:00 UTC. Add repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PERPLEXITY_API_KEY`, `RAPIDAPI_KEY`. Optional repo variable: `CONFLICT_ID` (defaults to `hormuz_2026` if unset). Workflow: `.github/workflows/ingest.yml`. Manual trigger: Actions → Ingest → Run workflow.
