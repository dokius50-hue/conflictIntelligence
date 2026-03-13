# Next Steps — Conflict Intelligence

Use this doc to pick up work in a new session. It lists the remaining tasks in priority order.

---

## Immediate next steps (in order)

### 1. Config Editor expansion (code)

Add two new tabs to the Config Editor so analysts can manually correct option and threshold state without going through the event queue:

- **Options tab** — List all `config_options` grouped by actor; each row has a status dropdown (`available` / `executed` / `degraded` / `foreclosed`) and Save button.
- **Thresholds tab** — List `config_threshold_conditions` grouped under parent thresholds; each condition has a met/unmet toggle and Save button.

**Implementation plan:** See `docs/plans/config_editor_expansion_a2770464.plan.md` (or `.cursor/plans/` if moved). Summary:

- Create `api/config-options.js` (GET + PATCH, admin auth)
- Create `api/config-threshold-conditions.js` (GET + PATCH with threshold-crossing check, admin auth)
- Register both in `server.js` and `netlify/functions/api.js`
- Add Options and Thresholds tabs + panels to `src/admin/ConfigEditor.jsx`

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
