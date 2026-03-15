-- 005_agent_schema.sql
-- Phase 3: Add agent-pipeline columns to queue tables.
-- key_findings, confidence_reasoning, corroboration_status

-- events_queue
ALTER TABLE events_queue
  ADD COLUMN IF NOT EXISTS key_findings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS confidence_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS corroboration_status TEXT DEFAULT 'unknown';

ALTER TABLE events_queue
  ADD CONSTRAINT chk_eq_corroboration_status
  CHECK (corroboration_status IN ('single_source','multi_corroborating','multi_divergent','unknown'));

-- tweets_queue
ALTER TABLE tweets_queue
  ADD COLUMN IF NOT EXISTS key_findings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS confidence_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS corroboration_status TEXT DEFAULT 'unknown';

ALTER TABLE tweets_queue
  ADD CONSTRAINT chk_tq_corroboration_status
  CHECK (corroboration_status IN ('single_source','multi_corroborating','multi_divergent','unknown'));
