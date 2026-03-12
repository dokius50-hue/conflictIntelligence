# CONFLICT INTELLIGENCE FRAMEWORK
### A Structured Situation Model for Live Geopolitical Crises
#### Current Instance: 2026 Strait of Hormuz Crisis

---

## What This Is

A webapp that builds a **formal model of a live conflict** — not a news aggregator, not an AI briefing tool. The product is the structure itself: who can do what, what depends on what, what has been foreclosed, and what would need to change for the situation to shift fundamentally.

**This is a generic framework.** The analytical engine, pipeline, and UI are conflict-agnostic. The conflict-specific content — actors, options, thresholds, scenarios, theatres — lives entirely in Supabase configuration tables. Pointing this at a different conflict means writing new config data, not changing code. Multiple conflicts can run simultaneously in the same database.

**The central thesis:** When your data model correctly captures actors, options, thresholds, and cross-theatre links, a human looking at it *sees* things they couldn't see before. The structure does the analytical work. AI assists the editor in building that structure; it does not replace editorial judgment and never writes directly to published tables.

---

## Schema Design Principles

These principles govern every table in the schema. When in doubt, return to them.

**Enforce structure on universal concepts. Use free text or config tables for conflict-specific values.**

Universal concepts that deserve enforced structure: an option has an intensity, a threshold condition has a display order, an event has a source URL, a location has coordinates. These are true of every conflict and the schema enforces them.

Conflict-specific values that must not be hardcoded as enums: actor sides, location types, market indicators, Twitter account lists, source trust levels. These vary between conflicts. They belong in config tables or free text fields with documented conventions, not CHECK constraints.

**Never delete config records. Mark them inactive.**

`prerequisites`, `unlocks`, `forecloses` on options and `falsifies_scenario_ids` on thresholds reference other records by text ID. Postgres cannot enforce foreign keys into array elements. The mitigation is a strict never-delete policy: set `is_active = false` instead. A validation function checks for dangling references on every config save. Deleting a record with dependents silently corrupts reasoning functions.

**Every UUID reference to `events` uses `ON DELETE SET NULL`.**

Config records reference events to provide evidence trails (`evidence_event_id`, `executed_event_id`, etc.). If an event is deleted — which should be rare but may happen — these references must null out cleanly, not cascade-delete config or leave dangling UUIDs.

**`metadata JSONB DEFAULT '{}'` is the escape valve, not the design.**

Every table has a `metadata` column for unanticipated fields. The discipline: if a field appears in `metadata` across two conflicts in a row, promote it to a real column via migration. Do not use `metadata` as a permanent home for fields you know you need.

---

## For the Vibe-Coding AI — Read This First

**If you are an AI assistant helping build this project, these rules are non-negotiable. Follow them precisely. They exist because past LLM-assisted iterations accumulated debt that broke things silently. Do not find reasons to work around them.**

### The Architecture Contract

```
DATA SOURCES
  Perplexity API  →  events_queue      ─┐
  Twitter API     →  tweets_queue       ├→ HUMAN REVIEW (admin UI)
  Manual entry    →  events_queue      ─┘       ↓
                                         AI TAG SUGGESTIONS
                                         (editor reviews, accepts/modifies/clears)
                                                 ↓
                                         PUBLISHED TABLES
                                         (events, perspectives)
                                                 ↓
                                         QUERY TOOL FUNCTIONS  (/lib/db/)
                                                 ↓
                                         REASONING FUNCTIONS  (/lib/reasoning/)
                                                 ↓
                                         REACT HOOKS  (/src/hooks/)
                                                 ↓
                                         REACT COMPONENTS  (render only)
```

Every layer has one job. **Never collapse layers. Never skip layers.**

### The Eight Rules

**Rule 1: Components never fetch data directly.**
Every React component receives data as props or via a custom hook. Hooks call query tool functions. Query tool functions call Supabase. No component imports `supabase` directly. No component contains a `useEffect` with a Supabase query. If you write this, stop and extract it into a hook immediately.

**Rule 2: Components never contain analytical logic.**
A component that renders an option menu does not know what "foreclosed" means. It receives a list of options with a `status` field and renders them. The reasoning function that computed `status` lives in `/lib/reasoning/`. If you find yourself writing a conditional in a component that interprets domain state — extract it.

**Rule 3: Reasoning functions are pure.**
Every function in `/lib/reasoning/` takes data in and returns a judgment out. No database calls. No side effects. No API calls. Fully testable with:
```bash
node -e "require('./lib/reasoning/options').getResidualOptionSpace(mockData)"
```
If a reasoning function cannot be tested this way, it is not a reasoning function.

**Rule 4: Nothing reaches published tables without human approval.**
Ingestion scripts write to `events_queue` and `tweets_queue` only. The admin UI reads from queue tables and writes to published tables on explicit human action. No script, automation, or AI call writes directly to `events`, `perspectives`, or any published table. Ever.

**Rule 5: Schema changes require a migration file.**
Never modify tables through the Supabase UI without also writing the migration SQL in `/supabase/migrations/`. The migration file is the source of truth. Write the migration first, then apply it.

**Rule 6: Config lives in Supabase, not git.**
Actors, options, thresholds, scenarios, locations, theatres, Twitter accounts, and source trust levels are stored in `config_*` tables, editable through the admin UI without redeployment. Do not move config back to JSON files or hardcode it in scripts.

**Rule 7: Every function has a comment explaining what analytical judgment it makes.**
Not what it does technically — what question it answers.
```javascript
// Returns the residual option space for an actor: all options that are
// available but not yet executed or foreclosed, with prerequisite status
// computed and locked options flagged, ordered by escalation intensity.
function getResidualOptionSpace(actorId, allOptions, events) { ... }
```

**Rule 8: When in doubt, do less.**
Implement the simpler version and flag it with a `// TODO:` comment. Do not invent scope. Do not add features not asked for. Do not refactor things that are not broken.

### The Periodic Lint Check

Run this after every significant vibe-coding session. Zero results is the only acceptable answer:
```bash
grep -r "supabase" src/components/
grep -r "supabase" src/pages/
```

If you find hits, fix them before continuing. Component debt compounds.

### The File Structure Contract

```
/
├── scripts/                         ← Ingestion. No UI code. No reasoning logic.
│   ├── ingest-perplexity.js         ← Perplexity API → sanitize → validate → queue
│   ├── ingest-twitter.js            ← Twitter API → queries config_twitter_accounts → queue
│   └── lib/
│       ├── sanitize.js              ← Strip fences, normalize dates, clean strings
│       ├── validate.js              ← Reject no-URL records, log rejects to /logs/
│       ├── twitter-client.js        ← Abstracted Twitter client (swap RapidAPI ↔ v2 here)
│       ├── build-tagging-context.js ← Assembles Claude context for tag suggestions
│       ├── suggest-tags.js          ← Calls Claude API, validates returned IDs, returns suggestions
│       └── tagging-prompts/
│           ├── v1.js                ← Versioned prompt. Never edit in place — always create v2.
│           └── v2.js                ← (future iterations)
│
├── agents/                          ← Agno swarm agents (Phase 3 — scaffolded from day one)
│   ├── ingestion/
│   │   ├── theatre-searcher.js      ← Searches one theatre at a time (run in parallel)
│   │   ├── deduplicator.js          ← Compares against recent queue records
│   │   ├── enricher.js              ← Finds corroborating URLs for fragments
│   │   └── orchestrator.js
│   ├── tagging/
│   │   ├── option-analyst.js        ← Focuses only on option menu impacts
│   │   ├── threshold-analyst.js     ← Focuses only on threshold condition impacts
│   │   ├── cross-theatre.js         ← Finds second-order effects across theatres
│   │   └── orchestrator.js
│   └── review-assist/
│       ├── context-builder.js       ← Pulls 72h events for editor briefing
│       ├── verifier.js              ← Fetches source URL, checks key facts match
│       ├── pattern-detector.js      ← Does this event fit or break recent patterns?
│       └── orchestrator.js
│
├── supabase/
│   └── migrations/                  ← Numbered SQL files. Source of truth for schema.
│
├── lib/
│   ├── db/                          ← Query tool functions. One file per domain.
│   │   ├── events.js
│   │   ├── options.js
│   │   ├── thresholds.js
│   │   ├── scenarios.js
│   │   ├── perspectives.js
│   │   ├── config.js                ← getActors(), getTheatres(), getLocations(), getSources()
│   │   └── queue.js
│   │
│   └── reasoning/                   ← Pure analytical functions. No DB calls. No side effects.
│       ├── options.js
│       ├── thresholds.js
│       ├── scenarios.js
│       └── causal-chain.js
│
├── src/                             ← React app
│   ├── hooks/
│   ├── components/
│   ├── pages/
│   └── admin/
│
├── tests/
│   └── reasoning/
│
└── logs/
    ├── raw/                         ← YYYY-MM-DD-HH-source.json — every API response
    └── failed/                      ← Parse failures for inspection
```

### How to Add a New Feature

1. Write the query tool function in `lib/db/` — test from REPL
2. Write the reasoning function in `lib/reasoning/` — test from REPL with real data
3. Write the React hook in `src/hooks/` — calls the query function
4. Write the component in `src/components/` — receives data as props, renders it
5. Wire them together in the page

**Never start at step 4. Never start at step 5. The REPL tests in steps 1 and 2 are not optional.**

---

## The Product — Five Core Views

### 1. The Situation Map
Geographic structure of the conflict. Theatre zones as colored overlays. Infrastructure nodes (desalination plants, oil facilities, nuclear sites, military bases, carrier group positions). Flow lines for oil/LNG routes (normal vs. current). Range arcs for key weapons systems. Click a map element → timeline filters to that location. Click a timeline event → map highlights its primary location.

### 2. The Event Timeline
Structured chronological record organized by theatre and phase. Every event carries: date, actors with roles, theatre(s), source with URL, confidence level, and links to which actor options it executed, degraded, or foreclosed. Not a news feed — a curated analytical record where every entry has been reviewed by a human editor.

### 3. The Option Elimination View
For each actor: an ordered menu of options from de-escalatory to existential. Statuses: **available**, **executed**, **degraded**, **foreclosed**, **locked** (prerequisites unmet). Options have prerequisites — some only unlock after others are taken. The residual option space — what each actor can still credibly do — is the core analytical output. Clicking an executed option shows the event that caused it.

### 4. The Threshold Proximity Tracker
Not probability estimates. For each threshold (a line not yet crossed): a list of required conditions, each checked or unchecked based on actual published events. The user sees how many conditions are met and judges proximity themselves. When a threshold is crossed, it is marked resolved with a timestamp and automatically triggers falsification checks on linked scenarios. The cascade consequences panel shows what crossing would mean across the system.

### 5. The Scenario Falsification Tracker
Each scenario carries survival conditions. When a survival condition is violated, the scenario is **ruled out with a timestamp** — not probability-adjusted. Scenarios that survive falsification longest are the ones worth taking seriously. A separate analyst perspectives panel shows commentator takes per theatre, sourced from curated Twitter accounts, never mixed into the factual event record.

---

## Architecture

### The Three Data Tiers

```
TIER 1 — FRAMEWORK DATA  (the analytical skeleton)
  Actors, option menus, threshold definitions, scenario conditions,
  geographic locations, theatre definitions, Twitter account registry,
  source trust levels, market indicator definitions
  → Supabase config_* tables
  → Editable via admin UI without redeployment
  → Designed generically — reusable across conflicts

TIER 2 — EDITORIAL DATA  (the live analytical record)
  Published events, threshold status updates, option execution status,
  theatre escalation levels, scenario viability, analyst perspectives,
  market snapshot values
  → Supabase published tables
  → Always passes through review queue with human approval
  → AI suggests tags; human accepts, modifies, or ignores

TIER 3 — INGESTED DATA  (raw, unvalidated, pending review)
  events_queue (Perplexity-sourced)
  tweets_queue (Twitter-sourced: OSINT fragments + analyst commentary)
  → Supabase queue tables
  → Nothing in these tables is displayed to end users
```

### The Stack

```
Frontend:    React + Vite
Styling:     Tailwind CSS
Maps:        Leaflet + react-leaflet
Charts:      Recharts (market), D3 (network/tree — Phase 2)
Database:    Supabase (Postgres + RLS from day one)
Hosting:     Vercel
Twitter:     RapidAPI (primary) / Twitter v2 direct (env var switch)
AI tagging:  Claude API — suggestions only, never auto-approved
Agents:      Agno (Phase 3 — directory scaffolded from day one)
```

---

## The Data Model

### Config Tables (Tier 1)

#### `config_conflicts`
```sql
CREATE TABLE config_conflicts (
  id           TEXT PRIMARY KEY,       -- 'hormuz_2026', 'ukraine_2022'
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  started_date DATE,
  status       TEXT DEFAULT 'active',  -- 'active|resolved|frozen'
  description  TEXT,
  metadata     JSONB DEFAULT '{}'
);
```

---

#### `config_actors`
```sql
CREATE TABLE config_actors (
  id          TEXT PRIMARY KEY,        -- 'iran', 'usa', 'hezbollah'
  conflict_id TEXT NOT NULL REFERENCES config_conflicts(id),
  name        TEXT NOT NULL,
  short_name  TEXT,
  color       TEXT NOT NULL,
  side        TEXT,
  -- Free text. Not an enum. Convention for Hormuz: 'us_israel|iran_axis|gcc|neutral'
  -- Document your convention in the conflict seed file. Do not enforce with CHECK.
  description TEXT,
  constraints JSONB DEFAULT '[]',
  -- shape: [{"id":"...","description":"...","type":"..."}]
  -- type is free text: 'military', 'economic', 'alliance', 'political', or anything else
  is_active   BOOLEAN DEFAULT true,
  metadata    JSONB DEFAULT '{}'
);
```

---

#### `config_options`
```sql
CREATE TABLE config_options (
  id                  TEXT PRIMARY KEY,  -- 'iran_opt_mine_strait'
  conflict_id         TEXT NOT NULL REFERENCES config_conflicts(id),
  actor_id            TEXT NOT NULL REFERENCES config_actors(id),
  label               TEXT NOT NULL,
  description         TEXT NOT NULL,
  escalation_direction TEXT NOT NULL,    -- 'escalatory|de-escalatory|neutral' (universal)
  intensity           INTEGER NOT NULL,  -- 1-10, ordering within actor menu
  status              TEXT NOT NULL DEFAULT 'available',
  -- 'available|executed|degraded|foreclosed|locked' — universal, load-bearing
  -- DO NOT add new status values without updating all reasoning functions that branch on this
  executed_date       DATE,
  executed_event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  degraded_reason     TEXT,
  degraded_event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
  prerequisites       TEXT[] DEFAULT '{}',
  -- References other config_options.id values.
  -- WARNING: No FK enforcement possible on array elements.
  -- NEVER delete an option that is referenced here. Set is_active = false instead.
  -- Run validate_config_references() after every config save to check for dangles.
  unlocks             TEXT[] DEFAULT '{}',   -- same warning as prerequisites
  forecloses          TEXT[] DEFAULT '{}',   -- same warning as prerequisites
  notes               TEXT,                  -- analytical context shown in admin UI
  is_active           BOOLEAN DEFAULT true,
  metadata            JSONB DEFAULT '{}'
);
```

---

#### `config_thresholds`
```sql
CREATE TABLE config_thresholds (
  id                   TEXT PRIMARY KEY,
  conflict_id          TEXT NOT NULL REFERENCES config_conflicts(id),
  label                TEXT NOT NULL,
  description          TEXT NOT NULL,
  theatre_id           TEXT NOT NULL REFERENCES config_theatres(id),
  status               TEXT NOT NULL DEFAULT 'not_approaching',
  -- 'not_approaching|approaching|imminent|crossed|resolved' (universal)
  crossed_date         TIMESTAMPTZ,
  crossed_event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
  cascade_consequences TEXT[] DEFAULT '{}',  -- freeform strings, no hardcoding
  falsifies_scenario_ids TEXT[] DEFAULT '{}',
  -- References config_scenarios.id values.
  -- WARNING: No FK enforcement on array elements. Never delete a scenario. Set is_active = false.
  is_active            BOOLEAN DEFAULT true,
  metadata             JSONB DEFAULT '{}'
);
```

---

#### `config_threshold_conditions`
```sql
CREATE TABLE config_threshold_conditions (
  id              TEXT PRIMARY KEY,       -- 'cond_us_escort_begun'
  threshold_id    TEXT NOT NULL REFERENCES config_thresholds(id),
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'unmet',
  -- 'met|unmet|no_longer_applicable' (universal)
  met_date        TIMESTAMPTZ,
  evidence_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  display_order   INTEGER NOT NULL
);
```

---

#### `config_scenarios`
```sql
CREATE TABLE config_scenarios (
  id               TEXT PRIMARY KEY,
  conflict_id      TEXT NOT NULL REFERENCES config_conflicts(id),
  label            TEXT NOT NULL,
  description      TEXT NOT NULL,
  viability_status TEXT NOT NULL DEFAULT 'viable',
  -- 'viable|falsified|confirmed' (universal)
  falsified_date   TIMESTAMPTZ,
  falsified_reason TEXT,
  falsified_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  required_moves   TEXT[] DEFAULT '{}',
  notes            TEXT,
  is_active        BOOLEAN DEFAULT true,
  metadata         JSONB DEFAULT '{}'
);
```

---

#### `config_scenario_conditions`
```sql
CREATE TABLE config_scenario_conditions (
  id              TEXT PRIMARY KEY,
  scenario_id     TEXT NOT NULL REFERENCES config_scenarios(id),
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'holding',
  -- 'holding|violated'
  -- NOT 'true|false' — 'true|false' reads as boolean and causes reasoning bugs.
  -- 'holding' = this survival condition still holds; scenario remains viable on this condition.
  -- 'violated' = this condition has been falsified; scenario may be ruled out.
  falsified_date  TIMESTAMPTZ,
  falsified_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  display_order   INTEGER NOT NULL
);
```

---

#### `config_theatres`
```sql
CREATE TABLE config_theatres (
  id                TEXT PRIMARY KEY,
  conflict_id       TEXT NOT NULL REFERENCES config_conflicts(id),
  label             TEXT NOT NULL,
  color             TEXT NOT NULL,
  accent            TEXT NOT NULL,
  escalation_level  INTEGER DEFAULT 1,      -- 1-10, human-set via admin UI
  escalation_trend  TEXT DEFAULT 'stable_low',
  -- 'rising|falling|stable_high|stable_low' (universal)
  description       TEXT,
  key_metric        TEXT,
  key_metric_updated TIMESTAMPTZ,
  -- Geographic bounds as explicit columns, not JSONB.
  -- Explicit columns are queryable, type-safe, and require no key-name assumptions in code.
  bounds_north      NUMERIC,
  bounds_south      NUMERIC,
  bounds_east       NUMERIC,
  bounds_west       NUMERIC,
  metadata          JSONB DEFAULT '{}'
);
```

---

#### `config_locations`
```sql
CREATE TABLE config_locations (
  id                    TEXT PRIMARY KEY,
  conflict_id           TEXT NOT NULL REFERENCES config_conflicts(id),
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL,
  -- Free text. Not an enum. Recommended vocabulary:
  -- 'military_base', 'desalination', 'nuclear', 'oil', 'port', 'city', 'chokepoint'
  -- Add new types freely for new conflicts without migration.
  lat                   NUMERIC NOT NULL,
  lng                   NUMERIC NOT NULL,
  country               TEXT,
  theatre_id            TEXT REFERENCES config_theatres(id),
  strategic_importance  TEXT,
  -- Free text. Recommended: 'critical', 'high', 'medium', 'low'
  status                TEXT DEFAULT 'intact',
  -- 'intact|damaged|destroyed|contested' (universal physical states)
  struck                BOOLEAN DEFAULT false,
  population_dependency INTEGER,
  description           TEXT,
  is_active             BOOLEAN DEFAULT true,
  metadata              JSONB DEFAULT '{}'
);
```

---

#### `config_twitter_accounts`
```sql
-- Twitter accounts to monitor, per conflict.
-- NOT hardcoded arrays in ingest-twitter.js.
-- Adding an account = INSERT here. No code change required.
CREATE TABLE config_twitter_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  handle       TEXT NOT NULL,
  display_name TEXT,
  author_type  TEXT NOT NULL,
  -- 'osint|analyst|official|journalist'
  -- osint     → ai_suggested_disposition: 'event' (fast-breaking fragments)
  -- analyst   → ai_suggested_disposition: 'perspective' (interpretation)
  -- official  → ai_suggested_disposition: 'event' (high trust)
  -- journalist → ai_suggested_disposition: 'perspective' or 'event' depending on content
  notes        TEXT,           -- why this account is relevant to this conflict
  is_active    BOOLEAN DEFAULT true,
  added_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conflict_id, handle)
);
```

---

#### `config_sources`
```sql
-- Source registry: trust levels per source type and name.
-- Determines auto_approve_eligible at ingest time.
-- NOT hardcoded logic in ingestion scripts.
-- Adding a new trusted source = INSERT here. No script change required.
CREATE TABLE config_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id           TEXT REFERENCES config_conflicts(id),
  -- NULL conflict_id = applies to all conflicts
  source_name           TEXT,           -- NULL = applies to all sources of this type
  source_type           TEXT NOT NULL,  -- 'wire|analysis|state_media|social|official'
  auto_approve_eligible BOOLEAN NOT NULL DEFAULT false,
  trust_level           TEXT NOT NULL DEFAULT 'standard',
  -- 'high|standard|low|untrusted'
  notes                 TEXT
);

-- Seed data for universal source type trust levels:
-- INSERT INTO config_sources (source_type, auto_approve_eligible, trust_level, notes)
-- VALUES
--   ('wire',         true,  'high',     'Reuters, AP, AFP — auto-approve eligible'),
--   ('analysis',     true,  'high',     'CSIS, ISW, Critical Threats — auto-approve eligible'),
--   ('official',     false, 'high',     'Government statements — manual review, high trust'),
--   ('state_media',  false, 'low',      'Always manual review'),
--   ('social',       false, 'low',      'Always manual review');
```

---

#### `market_indicators`
```sql
-- Which market signals matter for this conflict.
-- Conflict-specific. Hormuz: oil, tanker rates, gold, USD/INR.
-- West Africa conflict: cocoa futures, CFA franc, port throughput.
-- Adding an indicator = INSERT here. No migration required.
CREATE TABLE market_indicators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id   TEXT NOT NULL REFERENCES config_conflicts(id),
  key           TEXT NOT NULL,    -- 'oil_brent', 'usd_inr', 'cocoa_futures'
  label         TEXT NOT NULL,    -- 'Brent Crude ($/bbl)' — shown in UI
  unit          TEXT,             -- '$/bbl', 'index', 'USD' — shown in sparkline axis
  display_order INTEGER,
  color         TEXT,             -- hex color for sparkline line
  is_active     BOOLEAN DEFAULT true,
  UNIQUE(conflict_id, key)
);
```

---

### Published Tables (Tier 2)

#### `events`
```sql
CREATE TABLE events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id              TEXT NOT NULL REFERENCES config_conflicts(id),
  reported_at              TIMESTAMPTZ NOT NULL,
  occurred_at              TIMESTAMPTZ,
  time_precision           TEXT NOT NULL DEFAULT 'unknown',
  -- 'exact|approximate|date_only|unknown' (universal)
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  theatres                 TEXT[] NOT NULL DEFAULT '{}',
  actors                   JSONB NOT NULL DEFAULT '[]',
  -- shape: [{"id":"iran","role":"attacker","side":"iran_axis"}]
  -- role values: 'attacker|defender|mediator|affected|observer' (universal)
  -- side values: free text, conflict-specific, not enforced
  source_name              TEXT NOT NULL,
  source_url               TEXT NOT NULL,   -- required — no URL = cannot be approved
  source_type              TEXT NOT NULL,   -- 'wire|analysis|state_media|social|official'
  confidence               TEXT NOT NULL DEFAULT 'medium',  -- 'high|medium|low'
  escalation_direction     TEXT,            -- 'escalatory|de-escalatory|neutral|ambiguous'
  escalation_intensity     INTEGER,         -- 1-5
  location_id              TEXT REFERENCES config_locations(id),
  -- Option impact arrays. Values reference config_options.id.
  -- WARNING: No FK enforcement on array elements.
  -- If an option is deleted (don't), these silently become stale. Use is_active instead.
  options_executed         TEXT[] DEFAULT '{}',
  options_degraded         TEXT[] DEFAULT '{}',
  options_foreclosed       TEXT[] DEFAULT '{}',
  options_unlocked         TEXT[] DEFAULT '{}',
  thresholds_advanced      TEXT[] DEFAULT '{}',  -- config_threshold_conditions IDs
  corroborating_tweet_urls TEXT[] DEFAULT '{}',
  status                   TEXT NOT NULL DEFAULT 'published',
  approved_at              TIMESTAMPTZ DEFAULT now(),
  approved_by              TEXT,
  metadata                 JSONB DEFAULT '{}'
);
```

---

#### `perspectives`
```sql
-- Analyst and commentator takes. Never mixed into events table.
CREATE TABLE perspectives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  author_handle TEXT NOT NULL,
  author_name  TEXT,
  author_type  TEXT NOT NULL,   -- 'osint|analyst|official|journalist'
  tweet_url    TEXT NOT NULL,
  tweet_text   TEXT NOT NULL,
  summary      TEXT,
  theatres     TEXT[] DEFAULT '{}',
  actors       TEXT[] DEFAULT '{}',
  posted_at    TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'published',
  approved_at  TIMESTAMPTZ DEFAULT now(),
  metadata     JSONB DEFAULT '{}'
);
```

---

#### `market_snapshots` and `market_snapshot_values`
```sql
-- Snapshots are dated records. Values are the actual numbers, one row per indicator.
-- Adding a new indicator to track: INSERT into market_indicators, then populate values going forward.
-- No migration needed to add a new signal.

CREATE TABLE market_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  snapshot_date DATE NOT NULL,
  notes        TEXT,
  source       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE market_snapshot_values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id  UUID NOT NULL REFERENCES market_snapshots(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES market_indicators(id),
  value        NUMERIC NOT NULL,
  notes        TEXT,
  UNIQUE(snapshot_id, indicator_id)
);
```

---

### Queue Tables (Tier 3)

#### `events_queue`
```sql
CREATE TABLE events_queue (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id               TEXT NOT NULL REFERENCES config_conflicts(id),
  -- Standard event fields (all nullable at ingest — validated before approval):
  reported_at               TIMESTAMPTZ,
  occurred_at               TIMESTAMPTZ,
  time_precision            TEXT,
  title                     TEXT,
  description               TEXT,
  theatres                  TEXT[] DEFAULT '{}',
  actors                    JSONB DEFAULT '[]',
  source_name               TEXT,
  source_url                TEXT,
  source_type               TEXT,
  confidence                TEXT,
  escalation_direction      TEXT,
  escalation_intensity      INTEGER,
  location_id               TEXT,
  options_executed          TEXT[] DEFAULT '{}',
  options_degraded          TEXT[] DEFAULT '{}',
  options_foreclosed        TEXT[] DEFAULT '{}',
  options_unlocked          TEXT[] DEFAULT '{}',
  thresholds_advanced       TEXT[] DEFAULT '{}',
  -- Queue-specific fields:
  status                    TEXT NOT NULL DEFAULT 'pending',
  -- 'pending|approved|rejected'
  ingestion_source          TEXT NOT NULL,
  -- 'perplexity|manual|rss'
  auto_approve_eligible     BOOLEAN DEFAULT false,
  -- Derived from config_sources at ingest time — not hardcoded in script logic
  raw_input                 TEXT NOT NULL,
  -- Original API output. Never deleted. Essential audit trail.
  ai_suggested_tags         JSONB DEFAULT '{}',
  -- shape: {options_executed:[], options_degraded:[], options_foreclosed:[],
  --         options_unlocked:[], thresholds_advanced:[], confidence:"medium",
  --         reasoning:"one sentence for editor", flags:[]}
  ai_tagging_prompt_version TEXT,
  reviewer_notes            TEXT,
  reviewed_at               TIMESTAMPTZ,
  reviewed_by               TEXT,
  ingested_at               TIMESTAMPTZ DEFAULT now(),
  -- Agent observability (populated when agents replace scripts in Phase 3):
  processing_mode           TEXT DEFAULT 'script',
  -- 'script|agent'
  agent_run_id              TEXT,
  agent_trace               JSONB DEFAULT '{}'
  -- What each sub-agent decided and why. Populated by agent orchestrators.
);
```

---

#### `tweets_queue`
```sql
CREATE TABLE tweets_queue (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id              TEXT NOT NULL REFERENCES config_conflicts(id),
  tweet_id                 TEXT NOT NULL UNIQUE,
  author_handle            TEXT NOT NULL,
  author_name              TEXT,
  author_type              TEXT NOT NULL,
  -- 'osint|analyst|official|journalist' — copied from config_twitter_accounts at ingest
  tweet_text               TEXT NOT NULL,
  tweet_url                TEXT NOT NULL,
  posted_at                TIMESTAMPTZ NOT NULL,
  ingested_at              TIMESTAMPTZ DEFAULT now(),
  disposition              TEXT DEFAULT 'pending',
  -- 'pending|event|perspective|corroboration|rejected|duplicate'
  promoted_event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  promoted_perspective_id  UUID REFERENCES perspectives(id) ON DELETE SET NULL,
  corroborates_event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  ai_suggested_disposition TEXT,
  -- 'event|perspective|noise' — derived from author_type at ingest, refined by AI
  ai_suggested_tags        JSONB DEFAULT '{}',
  ai_reasoning             TEXT,
  reviewer_notes           TEXT,
  reviewed_at              TIMESTAMPTZ,
  raw_tweet                JSONB NOT NULL,
  -- Full API response. Never deleted.
  processing_mode          TEXT DEFAULT 'script',
  agent_run_id             TEXT,
  agent_trace              JSONB DEFAULT '{}'
);
```

---

## The Ingestion Pipeline

### Twitter — Config-Driven, Not Hardcoded

```javascript
// scripts/ingest-twitter.js
// Account list loaded from Supabase at runtime — never hardcoded here.
// To add an account: INSERT into config_twitter_accounts. No code change.

async function getAccountsToMonitor(conflictId) {
  const { data } = await supabase
    .from('config_twitter_accounts')
    .select('handle, author_type')
    .eq('conflict_id', conflictId)
    .eq('is_active', true)
  return data
}
```

### Source Trust — Config-Driven, Not Hardcoded

```javascript
// scripts/lib/validate.js
// auto_approve_eligible derived from config_sources at ingest time.
// To change trust level of a source: UPDATE config_sources. No code change.

async function getAutoApproveEligible(sourceName, sourceType, conflictId) {
  // Check for conflict-specific override first, then fall back to universal rule
  const { data } = await supabase
    .from('config_sources')
    .select('auto_approve_eligible')
    .or(`conflict_id.eq.${conflictId},conflict_id.is.null`)
    .or(`source_name.eq.${sourceName},source_name.is.null`)
    .eq('source_type', sourceType)
    .order('conflict_id', { nullsFirst: false })  -- conflict-specific wins
    .order('source_name', { nullsFirst: false })   -- name-specific wins over type-only
    .limit(1)
  return data?.[0]?.auto_approve_eligible ?? false
}
```

### The Twitter Client Abstraction

```javascript
// scripts/lib/twitter-client.js
// ALL Twitter API calls go through this file.
// To switch between RapidAPI and direct Twitter v2: change TWITTER_API_MODE env var.
// Nothing else in the project changes.

async function fetchAccountTimeline(handle, sinceId) {
  if (process.env.TWITTER_API_MODE === 'rapidapi') {
    return fetchViaRapidAPI(handle, sinceId)
  }
  // Twitter v2 free tier: 500k tweets/month read
  // 15 req per 15min window — sufficient for ~20 accounts at 4x/day with staggered polling
  return fetchViaDirectAPI(handle, sinceId)
}
```

### Ingestion Logging

Every script run saves raw output to `/logs/raw/YYYY-MM-DD-HH-source.json`. Parse failures save to `/logs/failed/`. Never deleted. Essential for debugging hallucination patterns and for the tagging quality feedback loop.

---

## The AI Tagging System

Tag suggestion quality is determined entirely by the quality of context passed to Claude. Context quality and prompt quality are independently improvable — two separate dials.

### The Three Levels of Tagging Intelligence

**Level 1 — Label matching (naive, do not use)**
Pass event record + list of valid option IDs. Claude pattern-matches labels. Misses nuance — doesn't know if prerequisites are met or what's already been executed.

**Level 2 — State-aware (default from day one)**
Pass event record + full current status of options and thresholds for relevant actors and theatres. Claude knows what's already happened, whether prerequisites are satisfied, how many threshold conditions are met. Can reason: "This event degrades `iran_opt_mine_surface` but cannot foreclose it because `iran_opt_mine_submarine` is a separate unaffected capability."

**Level 3 — Pattern-aware (activate when data is rich enough)**
Level 2 plus the last 72 hours of published events in the same theatres. Claude has temporal context — sees escalation direction, whether this event fits or breaks a pattern, flags cross-theatre effects. This is the ceiling of useful AI assistance.

### The Context Assembly Function

```javascript
// scripts/lib/build-tagging-context.js
// PRIMARY DIAL for tagging quality.
// Improve this to improve suggestion accuracy without touching the prompt.
// Improve the prompt to improve reasoning quality without touching this.

async function buildTaggingContext(eventRecord, conflictId) {
  const relevantActorIds  = eventRecord.actors.map(a => a.id)
  const relevantTheatreIds = eventRecord.theatres

  const [options, thresholds, recentEvents] = await Promise.all([
    getOptionsForActors(relevantActorIds),
    getThresholdsForTheatres(relevantTheatreIds),
    getRecentEvents(relevantTheatreIds, 72)
  ])

  return { options, thresholds, recentEvents }
}
```

### Versioned Prompt Files

```javascript
// scripts/lib/tagging-prompts/v1.js
// NEVER edit a prompt file in place.
// When improving: create v2.js, A/B compare on real events using the feedback loop
// query below, retire v1 only after v2 is demonstrably better.
// Store version used in events_queue.ai_tagging_prompt_version.

const TAGGING_PROMPT_V1 = `
You are an intelligence analyst tagging a conflict event record.

CURRENT OPTION STATUS FOR RELEVANT ACTORS:
{options_context}

CURRENT THRESHOLD CONDITIONS:
{thresholds_context}

RECENT EVENTS IN SAME THEATRES (last 72h):
{recent_events_context}

EVENT TO TAG:
{event_record}

Return JSON with exactly these fields:
{
  "options_executed": [],
  "options_degraded": [],
  "options_foreclosed": [],
  "options_unlocked": [],
  "thresholds_advanced": [],
  "confidence": "high|medium|low",
  "reasoning": "one sentence — the most important analytical judgment in these tags",
  "flags": []
}

Rules:
- Only suggest IDs that appear in the options and thresholds lists provided above
- If uncertain between degraded and foreclosed, choose degraded
- reasoning is for the human editor — make it the thing they most need to know
- flags[] is for cross-theatre effects or implications beyond the obvious tags
- Return only the JSON object. No preamble. No fences.
`
```

### ID Validation — Non-Negotiable

```javascript
// After receiving Claude's response, strip any hallucinated IDs.
// A single hallucinated option ID silently corrupts the option menu.
// validOptionIds and validConditionIds are loaded fresh from Supabase each run
// and injected into the prompt — Claude cannot suggest an ID not in the list.

function validateSuggestedTags(suggestions, validOptionIds, validConditionIds) {
  return {
    ...suggestions,
    options_executed:    suggestions.options_executed.filter(id => validOptionIds.has(id)),
    options_degraded:    suggestions.options_degraded.filter(id => validOptionIds.has(id)),
    options_foreclosed:  suggestions.options_foreclosed.filter(id => validOptionIds.has(id)),
    options_unlocked:    suggestions.options_unlocked.filter(id => validOptionIds.has(id)),
    thresholds_advanced: suggestions.thresholds_advanced.filter(id => validConditionIds.has(id))
  }
}
```

### The Tagging Quality Feedback Loop

`events_queue.ai_suggested_tags` holds what Claude suggested. The final `events` record holds what the editor approved. Query the diff after 50+ approved events to know what to fix in the prompt or context:

```sql
SELECT
  suggested_option,
  COUNT(*) AS times_suggested,
  SUM(CASE WHEN options_executed @> ARRAY[suggested_option] THEN 1 ELSE 0 END) AS times_approved
FROM (
  SELECT
    jsonb_array_elements_text(q.ai_suggested_tags->'options_executed') AS suggested_option,
    e.options_executed
  FROM events_queue q
  JOIN events e ON e.metadata->>'queue_id' = q.id::text
  WHERE q.status = 'approved'
) sub
GROUP BY suggested_option
ORDER BY times_suggested DESC;
```

---

## The Review Queue — Admin UI

### Event Card Design

Each pending event shows:
- Source badge: `[P]` Perplexity / `[T]` Twitter, source type, trust level from `config_sources`
- Title and description (editable inline)
- Source URL as clickable link — always opens in new tab
- `[Show raw input ▾]` — one click to see original API output alongside parsed record. Not optional.
- **AI suggested tags** — pre-populated, visually distinct (different colour, italic, `?` icon). AI reasoning sentence beneath each suggestion.
- **Inline actor option panel** — when editing tags, current option menu for each relevant actor opens in a side panel showing current status, prerequisites, and the event that caused them. Makes correct tagging fast, not just careful.
- Actions: `[✓ Approve]` `[✎ Edit & Approve]` `[✗ Reject]` with keyboard shortcuts

### Tweet Card Design

- Author handle, author type badge (`OSINT` / `ANALYST` / `OFFICIAL`), timestamp
- Tweet text
- AI suggested disposition with reasoning
- Actions: `[→ Promote to Event]` `[→ Mark as Perspective]` `[+ Corroborate Event]` `[✗ Noise]`
- "Corroborate" opens inline event search — appends tweet URL to existing event's `corroborating_tweet_urls`

### Preventing Tagging Burnout

- AI pre-suggests — editor accepts/modifies, not creates from scratch
- "No tags" is a valid fast-approval path — clean event with no tags beats a stalled queue
- Keyboard shortcuts for primary actions
- Queue shows oldest-first — prevent items ageing
- Batch reject for obvious noise tweets

---

## The Reasoning Layer

All functions in `lib/reasoning/` are pure. No database calls. No API calls. No side effects. Every function has a comment stating the analytical judgment it makes.

### `lib/reasoning/options.js`

```javascript
// Returns the residual option space for an actor:
// options available but not executed or foreclosed, with prerequisite status
// computed and locked options flagged, ordered by escalation intensity.
function getResidualOptionSpace(actorId, allOptions, events) { ... }

// Returns what changed in the option space as a result of a specific event.
// Used for the causal chain panel: click event → see cross-actor option effects.
function getOptionChangesFromEvent(eventId, allOptions) { ... }
```

### `lib/reasoning/thresholds.js`

```javascript
// Returns threshold proximity: conditions met/unmet, proximity ratio,
// and the next unmet condition to watch (lowest display_order among unmet).
function getThresholdProximity(threshold, conditions, recentEvents) { ... }

// Returns all thresholds that a given event advances.
// Used in event detail view to show which lines this event brought closer.
function getThresholdsAdvancedByEvent(eventId, conditions) { ... }
```

### `lib/reasoning/scenarios.js`

```javascript
// Returns all scenarios with viability computed from condition states.
// Falsified scenarios include the violating condition, its event, and timestamp.
// Viable scenarios include count of conditions still holding.
// Note: condition status is 'holding|violated' — never treat as boolean.
function getFalsifiedScenarios(scenarios, scenarioConditions) { ... }

// Returns scenarios that would be falsified if a given threshold is crossed.
// Used to show cascade consequences in the threshold tracker.
function getScenariosAtRiskFromThreshold(thresholdId, scenarios) { ... }
```

### `lib/reasoning/causal-chain.js`

```javascript
// Returns the full cross-theatre impact of a single event:
// which options it changed and how, which threshold conditions it satisfied,
// which scenarios it brought closer to falsification.
// This is the data for the causal chain panel — the feature that makes
// the logical structure of the conflict visible at a glance.
function getCausalChain(event, allOptions, allConditions, allScenarios) { ... }
```

---

## Agno Swarm Agents — Forward Compatibility

Scripts now, agents later. The `agents/` directory is scaffolded from day one. `lib/db/` and `lib/reasoning/` functions become the agent tool library without modification. The `processing_mode`, `agent_run_id`, and `agent_trace` fields on queue tables provide full observability when agents run.

### Where Agents Outperform Scripts

**Ingestion agent** — parallel per-theatre searches with theatre-specific source lists, deduplication against recent queue, URL enrichment for fragments.

**Tagging agent** — decomposed into `OptionAnalystAgent`, `ThresholdAnalystAgent`, `CrossTheatreAgent`, `SynthesisAgent`. Each gets focused prompt and context. The cross-theatre agent is the highest-value addition — catches non-obvious implications a single broad prompt consistently misses.

**Review assist agent** — new capability. Runs when editor opens a queue item: pulls 72h context, checks if event fits recent patterns, fetches source URL to verify key facts, flags implications. Returns a brief the editor reads before deciding.

### The Phase 3 Switch

```
Phase 2 scripts:          → Phase 3 agents:
ingest-perplexity.js      → agents/ingestion/orchestrator.js
suggest-tags.js           → agents/tagging/orchestrator.js
(new)                     → agents/review-assist/orchestrator.js
```

Queue tables, published tables, reasoning functions, React app — unchanged.

---

## Build Sequence

### Stage 1 — Understand the Data *(no code)*

Run Perplexity extraction prompt manually 3-4 times. Pull Twitter timelines from 5 OSINT and 3 analyst accounts manually. Save all raw output to `/logs/raw/`.

**Answer in writing before Stage 2:**
- What fields are always present in Perplexity output?
- What is the most common null or approximate field?
- What does a hallucination look like vs. a composite event?
- How often does Perplexity fabricate or mangle the source URL?
- How do OSINT tweet fragments differ from analyst tweets structurally?
- What is the max and min complexity of a real event record?
- Where does Perplexity add confident unverifiable specifics?

**Checkpoint ✓** You can describe a clean event record in plain English and name the 3 most common ways raw data will be dirty. These answers directly shape sanitization and validation logic.

---

### Stage 2 — Database Setup

1. Create Supabase project
2. **Enable RLS immediately — before any tables**
3. Write all tables as SQL in `/supabase/migrations/001_initial.sql`
4. Create in dependency order: `config_conflicts` → `config_actors` → `config_theatres` → `config_locations` → `config_options` → `config_thresholds` → `config_threshold_conditions` → `config_scenarios` → `config_scenario_conditions` → `config_twitter_accounts` → `config_sources` → `market_indicators` → `events` → `perspectives` → `market_snapshots` → `market_snapshot_values` → `events_queue` → `tweets_queue`
5. Set RLS policies:
   - anon key: SELECT on `config_*`, published tables, `market_*` only
   - service key: all operations
   - No INSERT/UPDATE on published tables from anon key, ever
6. **Test RLS explicitly** before any application code: anon key INSERT to `events` must return permission error. Service key INSERT must succeed.
7. Seed conflict, theatres, actors, `config_sources` universal trust levels, initial `config_twitter_accounts`
8. Seed options, thresholds, scenarios from Stage 1 research by hand

**Checkpoint ✓** RLS works as specified. All staged event records insert cleanly to `events_queue`. No errors. Zero records in published tables.

---

### Stage 3 — Ingestion Scripts

Build and test each piece in isolation:

1. `scripts/lib/sanitize.js`
2. `scripts/lib/validate.js` — uses `config_sources` for trust level lookup
3. `scripts/ingest-perplexity.js`
4. `scripts/lib/twitter-client.js`
5. `scripts/ingest-twitter.js` — uses `config_twitter_accounts` for account list
6. `scripts/lib/build-tagging-context.js` — Level 2 from day one
7. `scripts/lib/suggest-tags.js` — with ID validation
8. Wire tag suggestions into both ingestors

Run both ingestors 5 times on different days. Inspect all raw output.

**Checkpoint ✓** Both ingestors complete without errors. `/logs/raw/` populated. Queue tables have records with `ai_suggested_tags` and `raw_input` populated. Zero records in published tables.

---

### Stage 4 — Query Tool Functions

Build and REPL-test each before writing any UI:

```bash
node -e "
  const {getPublishedEvents} = require('./lib/db/events')
  getPublishedEvents({theatres:['gulf_waters'], limit:5}).then(console.log)
"
```

**Checkpoint ✓** Every function returns correct data. Output shapes match Stage 1 contracts. Zero analytical logic in any db function.

---

### Stage 5 — Reasoning Functions

Build and REPL-test with real data — not mocks:

```bash
node -e "
const {getActorOptions} = require('./lib/db/options')
const {getResidualOptionSpace} = require('./lib/reasoning/options')
getActorOptions('iran').then(opts => {
  const residual = getResidualOptionSpace('iran', opts, [])
  console.log('Available:', residual.filter(o => o.effectiveStatus === 'available').map(o => o.label))
  console.log('Locked:', residual.filter(o => o.effectiveStatus === 'locked').map(o => o.label))
})
"
```

**Checkpoint ✓** Every function produces analytically meaningful output. Every function is demonstrably pure. Note: any function branching on scenario condition status must use `=== 'violated'` not `=== 'false'`.

---

### Stage 6 — Admin Review Queue UI

Required: pending event cards with raw input toggle, AI tag pre-population, inline actor option panel, approve/edit/reject. Tweet cards with disposition workflow. Config editor for all `config_*` tables. Service key auth on all admin routes.

**Checkpoint ✓** Process 20 real events through the queue. Options and threshold conditions updated by real editorial decisions. Zero published records that didn't pass human review.

---

### Stage 7 — React Frontend

Build order: layout + theatre tabs → event timeline → situation map → map↔timeline interaction → option elimination view → threshold tracker → scenario falsification tracker → analyst perspectives panel → market panel (reads `market_indicators` + `market_snapshot_values`).

**Checkpoint ✓** Every view renders with real data. `grep -r "supabase" src/components/` returns zero results. Every component renders correctly with mock props.

---

## Known Risks and Mitigations

**Dangling array references** — `prerequisites`, `unlocks`, `forecloses` in options; `falsifies_scenario_ids` in thresholds; tag arrays in events. No FK enforcement on array elements. Mitigated by: strict never-delete policy (`is_active = false`), `validate_config_references()` called on every config save.

**`config_scenario_conditions.status` misread as boolean** — mitigated by using `'holding|violated'` not `'true|false'` and documenting this explicitly in every reasoning function that branches on it.

**Twitter API instability** — abstracted client in `twitter-client.js` means switching costs one file and one env var. System degrades gracefully without Twitter.

**Perplexity hallucination is systematic** — date drift, URL fabrication, composite events, confident fake specifics. Mitigated by: URL required for approval, raw input one click away, editor skepticism built into card design.

**Editorial tagging burnout** — AI pre-suggests, "no tags" is valid fast path, inline option panel makes correct tagging fast, keyboard shortcuts, oldest-first queue.

**Config drift** — all config in Supabase, admin config editor, no deployment needed to update the framework.

**Vibe-coded component debt** — eight rules stated at session start, `grep -r "supabase" src/components/` as periodic lint, refactor immediately on drift.

**Agent migration** — `agents/` scaffolded from day one, agent observability fields on queue tables from day one. Switch is additive.

---

## Deploying to a New Conflict

1. INSERT new row into `config_conflicts`
2. Write SQL seed files for all `config_*` tables for the new conflict
3. INSERT relevant rows into `config_sources` for conflict-specific trust overrides
4. INSERT rows into `config_twitter_accounts` for this conflict's OSINT and analyst accounts
5. INSERT rows into `market_indicators` for this conflict's relevant market signals
6. Update Perplexity prompt source list for the new conflict
7. Set `CONFLICT_ID` environment variable
8. Deploy — analytical engine, reasoning layer, and React frontend require zero code changes

Multiple conflicts run simultaneously. The UI reads `conflict_id` from env or URL param.

---

## Appendix A — Perplexity Extraction Prompt Template

```
You are an intelligence extraction agent. Extract structured event data
from recent news about [CONFLICT_NAME].

Search these sources for events from the last 24-48 hours:
[SOURCE_LIST — populated from conflict config at runtime]

For each distinct event, return a JSON array with exactly these fields:

{
  "reported_at": "ISO 8601 datetime",
  "occurred_at": "ISO 8601 datetime or null",
  "time_precision": "exact|approximate|date_only|unknown",
  "title": "one line, factual, max 80 chars",
  "description": "2-4 sentences, factual, no editorializing",
  "theatres": [VALID_THEATRE_IDS],
  "actors": [{"id":"VALID_ACTOR_ID","role":"attacker|defender|mediator|affected|observer","side":"free text"}],
  "source_name": "publication name",
  "source_url": "full URL — required, omit entire event if unavailable",
  "source_type": "wire|analysis|state_media|social|official",
  "confidence": "high|medium|low",
  "escalation_direction": "escalatory|de-escalatory|neutral|ambiguous",
  "escalation_intensity": 1-5
}

Valid actor IDs: [INJECTED FROM config_actors AT RUNTIME]
Valid theatre IDs: [INJECTED FROM config_theatres AT RUNTIME]

Return ONLY the JSON array. No preamble. No markdown fences. No commentary.
Omit any event for which you cannot provide a real, verifiable source_url.
```

---

## Appendix B — Deep Research Prompt Template

```
You are a specialist conflict analyst. Today is [DATE].

Provide expert-level analysis on underreported dimensions of [CONFLICT_NAME].
For each topic below, provide:
- Current escalation status (0-10)
- What has already happened that mainstream coverage is missing
- The next plausible escalatory steps
- The single most important 72-hour signal to watch
- The best specialized source to monitor
- Actor options this suggests should be added to the option menus

TOPICS: [CONFLICT-SPECIFIC UNDERREPORTED DIMENSIONS]
```

---

*README v4.0 — March 2026*
*Framework: conflict-agnostic structured situation model*
*Current instance: 2026 Strait of Hormuz Crisis*
*Stack: React + Vite + Tailwind + Supabase + Vercel + Agno (Phase 3)*
