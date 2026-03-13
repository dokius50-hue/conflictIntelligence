-- Status CHECK constraints for load-bearing fields
-- These are the framework's internal state machine values that reasoning functions branch on.
-- Invalid values will raise Postgres errors instead of being stored silently.

-- Fix any rows with incorrect 'satisfied' value (bug fix before constraint)
UPDATE config_threshold_conditions SET status = 'met' WHERE status = 'satisfied';

ALTER TABLE config_threshold_conditions
  ADD CONSTRAINT config_threshold_conditions_status_check
  CHECK (status IN ('met', 'unmet', 'no_longer_applicable'));

ALTER TABLE config_options
  ADD CONSTRAINT config_options_status_check
  CHECK (status IN ('available', 'executed', 'degraded', 'foreclosed'));

ALTER TABLE config_thresholds
  ADD CONSTRAINT config_thresholds_status_check
  CHECK (status IN ('not_approaching', 'approaching', 'imminent', 'crossed', 'resolved'));

ALTER TABLE config_scenarios
  ADD CONSTRAINT config_scenarios_viability_status_check
  CHECK (viability_status IN ('viable', 'falsified', 'confirmed'));

ALTER TABLE config_scenario_conditions
  ADD CONSTRAINT config_scenario_conditions_status_check
  CHECK (status IN ('holding', 'violated'));

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('published'));

ALTER TABLE events_queue
  ADD CONSTRAINT events_queue_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));
