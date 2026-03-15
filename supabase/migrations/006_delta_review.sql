-- Delta view: track when an analyst last reviewed each conflict's situation model.
-- last_reviewed_at is set by POST /api/delta/mark-reviewed and read by GET /api/delta.
ALTER TABLE config_conflicts
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
