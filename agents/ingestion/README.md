# Ingestion agents (Phase 3)

When scripts are replaced by Agno agents, this orchestrator will:

- Run **theatre-searcher** agents in parallel (one per theatre), each with theatre-specific source lists.
- **Deduplicator** compares candidate events against recent `events_queue` records.
- **Enricher** finds corroborating URLs for fragments.

**Tool library:** All reads/writes go through `lib/db/` (events, queue, config). No direct Supabase in agent code. Deduplication may use `lib/db/queue.js` (e.g. `getRecentQueueEvents(theatreIds, hours)`). Enricher may call external HTTP; results still flow into queue via `lib/db/queue.js`.

**Observability:** Populate `events_queue.processing_mode = 'agent'`, `agent_run_id`, and `agent_trace` (JSONB per sub-agent decision).
