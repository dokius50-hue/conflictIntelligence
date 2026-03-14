# Netlify Environment Variables

Use this checklist when deploying to Netlify. Set in Site settings → Environment variables.

## Required (app + API)

| Variable | Purpose | Sensitive |
|---------|---------|-----------|
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend DB access | **Yes** |
| `SUPABASE_ANON_KEY` | Public/anonymous access | No |

## Required for build (VITE_*)

| Variable | Purpose | Sensitive |
|---------|---------|-----------|
| `VITE_CONFLICT_ID` | Conflict ID embedded at build time (e.g. `hormuz_2026`) | No |
| `VITE_ADMIN_API_KEY` | Same as `ADMIN_API_KEY`; used by admin UI | **Yes** |

## Admin protection

| Variable | Purpose | Sensitive |
|---------|---------|-----------|
| `ADMIN_API_KEY` | Protects admin routes; if unset, admin is open | **Yes** |

## Optional (conflict + ingestion)

| Variable | Purpose | Sensitive |
|---------|---------|-----------|
| `CONFLICT_ID` | Default conflict for API (default: `hormuz_2026`) | No |
| `PERPLEXITY_API_KEY` | Perplexity ingestion | **Yes** |
| `ANTHROPIC_API_KEY` | AI tag suggestions | **Yes** |
| `TWITTER_API_MODE` | `rapidapi` or direct | No |
| `RAPIDAPI_KEY` | Twitter via RapidAPI | **Yes** |
| `TWITTER_BEARER_TOKEN` | Twitter v2 direct | **Yes** |

## Notes

- Redeploy after adding or changing `VITE_*` vars — they are baked in at build time.
- Mark sensitive vars as "sensitive" in Netlify so they are masked in logs.
