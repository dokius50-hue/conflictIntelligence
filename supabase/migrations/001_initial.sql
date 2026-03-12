-- Conflict Intelligence Framework — initial schema
-- RLS enabled on all tables (README: RLS from day one)

-- =============================================================================
-- TIER 1 — CONFIG (order respects FKs; events created before config that refs it)
-- =============================================================================

CREATE TABLE config_conflicts (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  started_date DATE,
  status       TEXT DEFAULT 'active',
  description  TEXT,
  metadata     JSONB DEFAULT '{}'
);

CREATE TABLE config_actors (
  id           TEXT PRIMARY KEY,
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  name         TEXT NOT NULL,
  short_name   TEXT,
  color        TEXT NOT NULL,
  side         TEXT,
  description  TEXT,
  constraints  JSONB DEFAULT '[]',
  is_active    BOOLEAN DEFAULT true,
  metadata     JSONB DEFAULT '{}'
);

CREATE TABLE config_theatres (
  id                 TEXT PRIMARY KEY,
  conflict_id        TEXT NOT NULL REFERENCES config_conflicts(id),
  label              TEXT NOT NULL,
  color              TEXT NOT NULL,
  accent             TEXT NOT NULL,
  escalation_level   INTEGER DEFAULT 1,
  escalation_trend   TEXT DEFAULT 'stable_low',
  description        TEXT,
  key_metric         TEXT,
  key_metric_updated TIMESTAMPTZ,
  bounds_north       NUMERIC,
  bounds_south       NUMERIC,
  bounds_east        NUMERIC,
  bounds_west        NUMERIC,
  metadata           JSONB DEFAULT '{}'
);

CREATE TABLE config_locations (
  id                    TEXT PRIMARY KEY,
  conflict_id           TEXT NOT NULL REFERENCES config_conflicts(id),
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL,
  lat                   NUMERIC NOT NULL,
  lng                   NUMERIC NOT NULL,
  country               TEXT,
  theatre_id            TEXT REFERENCES config_theatres(id),
  strategic_importance  TEXT,
  status                TEXT DEFAULT 'intact',
  struck                BOOLEAN DEFAULT false,
  population_dependency INTEGER,
  description           TEXT,
  is_active             BOOLEAN DEFAULT true,
  metadata              JSONB DEFAULT '{}'
);

-- Queue table before events (events.queue_id references this)
CREATE TABLE events_queue (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id               TEXT NOT NULL REFERENCES config_conflicts(id),
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
  status                    TEXT NOT NULL DEFAULT 'pending',
  ingestion_source          TEXT NOT NULL,
  auto_approve_eligible     BOOLEAN DEFAULT false,
  raw_input                 TEXT NOT NULL,
  ai_suggested_tags         JSONB DEFAULT '{}',
  ai_tagging_prompt_version  TEXT,
  reviewer_notes            TEXT,
  reviewed_at               TIMESTAMPTZ,
  reviewed_by               TEXT,
  ingested_at               TIMESTAMPTZ DEFAULT now(),
  processing_mode           TEXT DEFAULT 'script',
  agent_run_id              TEXT,
  agent_trace               JSONB DEFAULT '{}'
);

-- TIER 2 — Published events (before config_options etc. that reference events)
CREATE TABLE events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id              TEXT NOT NULL REFERENCES config_conflicts(id),
  queue_id                 UUID REFERENCES events_queue(id) ON DELETE SET NULL,
  reported_at              TIMESTAMPTZ NOT NULL,
  occurred_at              TIMESTAMPTZ,
  time_precision           TEXT NOT NULL DEFAULT 'unknown',
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  theatres                 TEXT[] NOT NULL DEFAULT '{}',
  actors                   JSONB NOT NULL DEFAULT '[]',
  source_name              TEXT NOT NULL,
  source_url               TEXT NOT NULL,
  source_type              TEXT NOT NULL,
  confidence               TEXT NOT NULL DEFAULT 'medium',
  escalation_direction      TEXT,
  escalation_intensity      INTEGER,
  location_id              TEXT REFERENCES config_locations(id),
  options_executed         TEXT[] DEFAULT '{}',
  options_degraded         TEXT[] DEFAULT '{}',
  options_foreclosed       TEXT[] DEFAULT '{}',
  options_unlocked         TEXT[] DEFAULT '{}',
  thresholds_advanced      TEXT[] DEFAULT '{}',
  corroborating_tweet_urls  TEXT[] DEFAULT '{}',
  status                   TEXT NOT NULL DEFAULT 'published',
  approved_at              TIMESTAMPTZ DEFAULT now(),
  approved_by              TEXT,
  metadata                 JSONB DEFAULT '{}'
);

CREATE TABLE config_options (
  id                   TEXT PRIMARY KEY,
  conflict_id          TEXT NOT NULL REFERENCES config_conflicts(id),
  actor_id             TEXT NOT NULL REFERENCES config_actors(id),
  label                TEXT NOT NULL,
  description          TEXT NOT NULL,
  escalation_direction TEXT NOT NULL,
  intensity            INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'available',
  executed_date        DATE,
  executed_event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  degraded_reason      TEXT,
  degraded_event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  prerequisites        TEXT[] DEFAULT '{}',
  unlocks              TEXT[] DEFAULT '{}',
  forecloses           TEXT[] DEFAULT '{}',
  notes                TEXT,
  is_active            BOOLEAN DEFAULT true,
  metadata             JSONB DEFAULT '{}'
);

CREATE TABLE config_thresholds (
  id                    TEXT PRIMARY KEY,
  conflict_id           TEXT NOT NULL REFERENCES config_conflicts(id),
  label                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  theatre_id            TEXT NOT NULL REFERENCES config_theatres(id),
  status                TEXT NOT NULL DEFAULT 'not_approaching',
  crossed_date          TIMESTAMPTZ,
  crossed_event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  cascade_consequences TEXT[] DEFAULT '{}',
  falsifies_scenario_ids TEXT[] DEFAULT '{}',
  is_active             BOOLEAN DEFAULT true,
  metadata              JSONB DEFAULT '{}'
);

CREATE TABLE config_threshold_conditions (
  id               TEXT PRIMARY KEY,
  threshold_id     TEXT NOT NULL REFERENCES config_thresholds(id),
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'unmet',
  met_date         TIMESTAMPTZ,
  evidence_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  display_order    INTEGER NOT NULL
);

CREATE TABLE config_scenarios (
  id                TEXT PRIMARY KEY,
  conflict_id       TEXT NOT NULL REFERENCES config_conflicts(id),
  label             TEXT NOT NULL,
  description       TEXT NOT NULL,
  viability_status  TEXT NOT NULL DEFAULT 'viable',
  falsified_date    TIMESTAMPTZ,
  falsified_reason  TEXT,
  falsified_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  required_moves   TEXT[] DEFAULT '{}',
  notes             TEXT,
  is_active         BOOLEAN DEFAULT true,
  metadata          JSONB DEFAULT '{}'
);

CREATE TABLE config_scenario_conditions (
  id                 TEXT PRIMARY KEY,
  scenario_id        TEXT NOT NULL REFERENCES config_scenarios(id),
  description        TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'holding',
  falsified_date     TIMESTAMPTZ,
  falsified_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  display_order       INTEGER NOT NULL
);

CREATE TABLE config_twitter_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  handle       TEXT NOT NULL,
  display_name TEXT,
  author_type  TEXT NOT NULL,
  notes        TEXT,
  is_active    BOOLEAN DEFAULT true,
  added_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conflict_id, handle)
);

CREATE TABLE config_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id           TEXT REFERENCES config_conflicts(id),
  source_name           TEXT,
  source_type           TEXT NOT NULL,
  auto_approve_eligible BOOLEAN NOT NULL DEFAULT false,
  trust_level           TEXT NOT NULL DEFAULT 'standard',
  notes                 TEXT
);

CREATE TABLE market_indicators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id   TEXT NOT NULL REFERENCES config_conflicts(id),
  key           TEXT NOT NULL,
  label         TEXT NOT NULL,
  unit          TEXT,
  display_order INTEGER,
  color         TEXT,
  is_active     BOOLEAN DEFAULT true,
  UNIQUE(conflict_id, key)
);

CREATE TABLE perspectives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id    TEXT NOT NULL REFERENCES config_conflicts(id),
  author_handle   TEXT NOT NULL,
  author_name    TEXT,
  author_type    TEXT NOT NULL,
  tweet_url      TEXT NOT NULL,
  tweet_text     TEXT NOT NULL,
  summary        TEXT,
  theatres       TEXT[] DEFAULT '{}',
  actors         TEXT[] DEFAULT '{}',
  posted_at      TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'published',
  approved_at    TIMESTAMPTZ DEFAULT now(),
  metadata       JSONB DEFAULT '{}'
);

CREATE TABLE market_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id  TEXT NOT NULL REFERENCES config_conflicts(id),
  snapshot_date DATE NOT NULL,
  notes        TEXT,
  source       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE market_snapshot_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id   UUID NOT NULL REFERENCES market_snapshots(id) ON DELETE CASCADE,
  indicator_id  UUID NOT NULL REFERENCES market_indicators(id),
  value         NUMERIC NOT NULL,
  notes         TEXT,
  UNIQUE(snapshot_id, indicator_id)
);

CREATE TABLE tweets_queue (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id              TEXT NOT NULL REFERENCES config_conflicts(id),
  tweet_id                 TEXT NOT NULL UNIQUE,
  author_handle            TEXT NOT NULL,
  author_name              TEXT,
  author_type              TEXT NOT NULL,
  tweet_text               TEXT NOT NULL,
  tweet_url                TEXT NOT NULL,
  posted_at                TIMESTAMPTZ NOT NULL,
  ingested_at              TIMESTAMPTZ DEFAULT now(),
  disposition              TEXT DEFAULT 'pending',
  promoted_event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  promoted_perspective_id   UUID REFERENCES perspectives(id) ON DELETE SET NULL,
  corroborates_event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
  ai_suggested_disposition  TEXT,
  ai_suggested_tags        JSONB DEFAULT '{}',
  ai_reasoning             TEXT,
  reviewer_notes           TEXT,
  reviewed_at              TIMESTAMPTZ,
  raw_tweet                JSONB NOT NULL,
  processing_mode          TEXT DEFAULT 'script',
  agent_run_id             TEXT,
  agent_trace              JSONB DEFAULT '{}'
);

-- =============================================================================
-- validate_config_references() — returns rows of dangling IDs (inline warnings)
-- Call via Supabase RPC after every config save. Not a blocker.
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_config_references(p_conflict_id TEXT DEFAULT NULL)
RETURNS TABLE(
  source_table TEXT,
  source_id TEXT,
  reference_type TEXT,
  dangling_id TEXT
) AS $$
BEGIN
  -- Dangling option IDs in config_options (prerequisites, unlocks, forecloses)
  RETURN QUERY
  SELECT 'config_options'::TEXT, o.id, 'prerequisite'::TEXT, p.ref::TEXT
  FROM config_options o, unnest(o.prerequisites) AS p(ref)
  WHERE o.is_active AND (p_conflict_id IS NULL OR o.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o2 WHERE o2.id = p.ref AND o2.is_active)
  UNION ALL
  SELECT 'config_options'::TEXT, o.id, 'unlocks'::TEXT, u.ref::TEXT
  FROM config_options o, unnest(o.unlocks) AS u(ref)
  WHERE o.is_active AND (p_conflict_id IS NULL OR o.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o2 WHERE o2.id = u.ref AND o2.is_active)
  UNION ALL
  SELECT 'config_options'::TEXT, o.id, 'forecloses'::TEXT, f.ref::TEXT
  FROM config_options o, unnest(o.forecloses) AS f(ref)
  WHERE o.is_active AND (p_conflict_id IS NULL OR o.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o2 WHERE o2.id = f.ref AND o2.is_active);

  -- Dangling scenario IDs in config_thresholds.falsifies_scenario_ids
  RETURN QUERY
  SELECT 'config_thresholds'::TEXT, t.id, 'falsifies_scenario'::TEXT, fs.ref::TEXT
  FROM config_thresholds t, unnest(t.falsifies_scenario_ids) AS fs(ref)
  WHERE t.is_active AND (p_conflict_id IS NULL OR t.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_scenarios s WHERE s.id = fs.ref AND s.is_active);

  -- Option IDs in events that don't exist or are inactive
  RETURN QUERY
  SELECT 'events'::TEXT, e.id::TEXT, 'options_executed'::TEXT, ex.ref::TEXT
  FROM events e, unnest(e.options_executed) AS ex(ref)
  WHERE (p_conflict_id IS NULL OR e.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o WHERE o.id = ex.ref AND o.is_active)
  UNION ALL
  SELECT 'events'::TEXT, e.id::TEXT, 'options_degraded'::TEXT, d.ref::TEXT
  FROM events e, unnest(e.options_degraded) AS d(ref)
  WHERE (p_conflict_id IS NULL OR e.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o WHERE o.id = d.ref AND o.is_active)
  UNION ALL
  SELECT 'events'::TEXT, e.id::TEXT, 'options_foreclosed'::TEXT, fc.ref::TEXT
  FROM events e, unnest(e.options_foreclosed) AS fc(ref)
  WHERE (p_conflict_id IS NULL OR e.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o WHERE o.id = fc.ref AND o.is_active)
  UNION ALL
  SELECT 'events'::TEXT, e.id::TEXT, 'options_unlocked'::TEXT, ul.ref::TEXT
  FROM events e, unnest(e.options_unlocked) AS ul(ref)
  WHERE (p_conflict_id IS NULL OR e.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_options o WHERE o.id = ul.ref AND o.is_active);

  -- Threshold condition IDs in events that don't exist
  RETURN QUERY
  SELECT 'events'::TEXT, e.id::TEXT, 'thresholds_advanced'::TEXT, ta.ref::TEXT
  FROM events e, unnest(e.thresholds_advanced) AS ta(ref)
  WHERE (p_conflict_id IS NULL OR e.conflict_id = p_conflict_id)
  AND NOT EXISTS (SELECT 1 FROM config_threshold_conditions c WHERE c.id = ta.ref);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE config_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_theatres ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_threshold_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_scenario_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshot_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets_queue ENABLE ROW LEVEL SECURITY;

-- anon: SELECT only on config_*, published tables, market_*
CREATE POLICY "anon_select_config_conflicts" ON config_conflicts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_actors" ON config_actors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_theatres" ON config_theatres FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_locations" ON config_locations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_options" ON config_options FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_thresholds" ON config_thresholds FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_threshold_conditions" ON config_threshold_conditions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_scenarios" ON config_scenarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_scenario_conditions" ON config_scenario_conditions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_twitter_accounts" ON config_twitter_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_config_sources" ON config_sources FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_market_indicators" ON market_indicators FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_perspectives" ON perspectives FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_market_snapshots" ON market_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_market_snapshot_values" ON market_snapshot_values FOR SELECT TO anon USING (true);

-- anon: no access to queue tables
-- (no policy = no access for anon)

-- service_role: full access (Supabase service role bypasses RLS by default; explicit policies optional)
-- For admin backend using service key: full CRUD. No anon INSERT/UPDATE on published tables.
-- We rely on: anon has only SELECT on published/config; queue and writes go through backend with service key.
