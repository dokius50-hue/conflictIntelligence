-- Seed: 2026 Strait of Hormuz crisis (minimal — options/thresholds/scenarios from Stage 1 research)
INSERT INTO config_conflicts (id, name, short_name, started_date, status, description)
VALUES (
  'hormuz_2026',
  '2026 Strait of Hormuz Crisis',
  'Hormuz 2026',
  '2026-01-01',
  'active',
  'Structured situation model for the Strait of Hormuz crisis. Framework instance.'
);

INSERT INTO config_actors (id, conflict_id, name, short_name, color, side, is_active)
VALUES
  ('iran', 'hormuz_2026', 'Iran', 'Iran', '#2e7d32', 'iran_axis', true),
  ('usa', 'hormuz_2026', 'United States', 'USA', '#1565c0', 'us_israel', true),
  ('gcc', 'hormuz_2026', 'GCC States', 'GCC', '#00695c', 'gcc', true);

INSERT INTO config_theatres (id, conflict_id, label, color, accent, escalation_level, escalation_trend)
VALUES
  ('gulf_waters', 'hormuz_2026', 'Gulf Waters', '#0d47a1', '#42a5f5', 1, 'stable_low'),
  ('red_sea', 'hormuz_2026', 'Red Sea', '#b71c1c', '#ef5350', 1, 'stable_low');

-- Universal source trust levels (README seed)
INSERT INTO config_sources (conflict_id, source_name, source_type, auto_approve_eligible, trust_level, notes)
VALUES
  (NULL, NULL, 'wire', true, 'high', 'Reuters, AP, AFP — auto-approve eligible'),
  (NULL, NULL, 'analysis', true, 'high', 'CSIS, ISW, Critical Threats — auto-approve eligible'),
  (NULL, NULL, 'official', false, 'high', 'Government statements — manual review, high trust'),
  (NULL, NULL, 'state_media', false, 'low', 'Always manual review'),
  (NULL, NULL, 'social', false, 'low', 'Always manual review');
