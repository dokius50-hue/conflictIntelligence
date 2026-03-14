# Next Steps — Conflict Intelligence

Use this doc to pick up work in a new session. It lists the remaining tasks in priority order.

---

## Immediate next steps (in order)

### 1. ~~Config Editor expansion~~ (done)

Options and Thresholds tabs added. Analysts can manually correct option status and threshold conditions via Admin → Config.

### 2. Connect to Netlify (manual)

The codebase is ready for Netlify. Connect when ready:

1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git → select this repo
2. Build settings are auto-detected from `netlify.toml`
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ADMIN_API_KEY`, `CONFLICT_ID`, `VITE_CONFLICT_ID`
4. Deploy (or redeploy after adding env vars so `VITE_CONFLICT_ID` is embedded at build time)

### 3. Multi-conflict (no code)

Zero code changes required. The 8-step guide is in `CONFLICT_INTELLIGENCE_README.md`. Add a new conflict by inserting rows into `config_*` tables with a new `conflict_id` and setting `CONFLICT_ID` env var.

---

## Future / lower priority

- **Phase 3 Agno agents** — Specs in `agents/ingestion/`, `agents/tagging/`, `agents/review-assist/`. Would automate parts of the human review workflow.
- **Live ingestion cycle** — Run `npm run ingest:perplexity` and `npm run ingest:twitter` regularly; process events through Admin Queue. Operational workflow, no code needed.
