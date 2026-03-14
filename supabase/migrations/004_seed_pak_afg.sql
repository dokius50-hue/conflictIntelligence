-- Seed: Pakistan / Afghanistan Taliban tensions (pak_afg_2025)
-- Multi-conflict: add second conflict instance. No code changes required.

INSERT INTO config_conflicts (id, name, short_name, started_date, status, description)
VALUES (
  'pak_afg_2025',
  'Pakistan–Afghanistan Taliban Tensions',
  'Pak–Afg 2025',
  '2024-01-01',
  'active',
  'Structured situation model for Pakistan–Afghanistan border tensions, TTP cross-border activity, and regional dynamics.'
);

INSERT INTO config_actors (id, conflict_id, name, short_name, color, side, is_active)
VALUES
  ('pakistan', 'pak_afg_2025', 'Pakistan', 'Pakistan', '#00695c', 'state', true),
  ('afghanistan', 'pak_afg_2025', 'Afghanistan (IEA)', 'Afghanistan', '#37474f', 'taliban_govt', true),
  ('ttp', 'pak_afg_2025', 'Tehrik-i-Taliban Pakistan', 'TTP', '#b71c1c', 'insurgent', true),
  ('china', 'pak_afg_2025', 'China', 'China', '#e65100', 'regional', true);

INSERT INTO config_theatres (id, conflict_id, label, color, accent, escalation_level, escalation_trend)
VALUES
  ('border_region', 'pak_afg_2025', 'Durand Line / Border', '#4a148c', '#7b1fa2', 1, 'stable_low'),
  ('pakistan_tribal', 'pak_afg_2025', 'Pakistan Tribal Areas', '#bf360c', '#ff5722', 1, 'stable_low'),
  ('afghanistan_interior', 'pak_afg_2025', 'Afghanistan Interior', '#1b5e20', '#4caf50', 1, 'stable_low');

INSERT INTO config_locations (id, conflict_id, name, type, lat, lng, country, theatre_id, strategic_importance, is_active)
VALUES
  ('torkham', 'pak_afg_2025', 'Torkham Crossing', 'chokepoint', 34.23, 71.05, 'Pakistan', 'border_region', 'high', true),
  ('chaman', 'pak_afg_2025', 'Chaman Border', 'chokepoint', 30.92, 66.45, 'Pakistan', 'border_region', 'high', true),
  ('kabul', 'pak_afg_2025', 'Kabul', 'city', 34.52, 69.17, 'Afghanistan', 'afghanistan_interior', 'critical', true),
  ('peshawar', 'pak_afg_2025', 'Peshawar', 'city', 34.01, 71.54, 'Pakistan', 'pakistan_tribal', 'high', true),
  ('quetta', 'pak_afg_2025', 'Quetta', 'city', 30.18, 67.00, 'Pakistan', 'pakistan_tribal', 'high', true);

INSERT INTO config_options (id, conflict_id, actor_id, label, description, escalation_direction, intensity, status, is_active)
VALUES
  ('pak_opt_dialogue', 'pak_afg_2025', 'pakistan', 'Dialogue with IEA', 'Engage Afghanistan on TTP sanctuaries via diplomatic channels', 'de-escalatory', 1, 'available', true),
  ('pak_opt_military_ops', 'pak_afg_2025', 'pakistan', 'Cross-Border Military Operations', 'Conduct limited strikes or operations against TTP in border areas', 'escalatory', 2, 'available', true),
  ('pak_opt_full_offensive', 'pak_afg_2025', 'pakistan', 'Major Offensive', 'Large-scale military action against TTP strongholds', 'escalatory', 3, 'available', true),
  ('afg_opt_restrain_ttp', 'pak_afg_2025', 'afghanistan', 'Restrain TTP', 'Use influence to curb TTP cross-border attacks', 'de-escalatory', 1, 'available', true),
  ('afg_opt_tacit_support', 'pak_afg_2025', 'afghanistan', 'Tacit Support for TTP', 'Allow TTP sanctuary without overt endorsement', 'escalatory', 2, 'available', true),
  ('ttp_opt_attacks', 'pak_afg_2025', 'ttp', 'Cross-Border Attacks', 'Conduct attacks on Pakistani security or civilian targets', 'escalatory', 1, 'available', true),
  ('ttp_opt_major_escalation', 'pak_afg_2025', 'ttp', 'Major Escalation', 'Large-scale attack or sustained campaign', 'escalatory', 2, 'available', true),
  ('china_opt_mediation', 'pak_afg_2025', 'china', 'Mediation', 'Offer mediation between Pakistan and Afghanistan', 'de-escalatory', 1, 'available', true),
  ('china_opt_economic_leverage', 'pak_afg_2025', 'china', 'Economic Leverage', 'Use CPEC and aid as leverage', 'neutral', 2, 'available', true);

INSERT INTO config_thresholds (id, conflict_id, label, description, theatre_id, status, is_active)
VALUES
  ('thresh_pak_afg_major_incursion', 'pak_afg_2025', 'Major Cross-Border Incursion', 'Large-scale military incursion across Durand Line by either side', 'border_region', 'not_approaching', true),
  ('thresh_pak_afg_diplomatic_break', 'pak_afg_2025', 'Diplomatic Break', 'Formal severance of Pakistan–Afghanistan diplomatic relations', 'border_region', 'not_approaching', true);

INSERT INTO config_threshold_conditions (id, threshold_id, description, status, display_order)
VALUES
  ('cond_pak_afg_1', 'thresh_pak_afg_major_incursion', 'Pakistan conducts cross-border ground operation into Afghanistan', 'unmet', 1),
  ('cond_pak_afg_2', 'thresh_pak_afg_major_incursion', 'Afghanistan/IEA openly supports TTP offensive into Pakistan', 'unmet', 2),
  ('cond_pak_afg_3', 'thresh_pak_afg_diplomatic_break', 'Either side expels diplomats or closes embassy', 'unmet', 1),
  ('cond_pak_afg_4', 'thresh_pak_afg_diplomatic_break', 'Border crossings formally closed', 'unmet', 2);

INSERT INTO config_scenarios (id, conflict_id, label, description, viability_status, is_active)
VALUES
  ('scen_pak_afg_managed', 'pak_afg_2025', 'Managed Tension', 'Ongoing low-level TTP activity with periodic Pakistan operations; no full rupture', 'viable', true),
  ('scen_pak_afg_escalation', 'pak_afg_2025', 'Escalation', 'Major cross-border conflict or diplomatic break', 'viable', true),
  ('scen_pak_afg_diplomatic', 'pak_afg_2025', 'Diplomatic Resolution', 'Pakistan–Afghanistan agreement on TTP; reduced violence', 'viable', true);

INSERT INTO config_scenario_conditions (id, scenario_id, description, status, display_order)
VALUES
  ('scond_pak_afg_1', 'scen_pak_afg_managed', 'No major cross-border incursion', 'holding', 1),
  ('scond_pak_afg_2', 'scen_pak_afg_managed', 'Diplomatic channels remain open', 'holding', 2),
  ('scond_pak_afg_3', 'scen_pak_afg_escalation', 'TTP sustains high attack tempo', 'holding', 1),
  ('scond_pak_afg_4', 'scen_pak_afg_escalation', 'Pakistan escalates military response', 'holding', 2),
  ('scond_pak_afg_5', 'scen_pak_afg_diplomatic', 'IEA takes visible steps to restrain TTP', 'holding', 1),
  ('scond_pak_afg_6', 'scen_pak_afg_diplomatic', 'Pakistan reduces cross-border operations', 'holding', 2);

INSERT INTO config_twitter_accounts (conflict_id, handle, display_name, author_type, notes, is_active)
VALUES
  ('pak_afg_2025', 'NatsecJeff', NULL, 'analyst', 'South Asia security analyst', true),
  ('pak_afg_2025', 'ScholarsCircle', NULL, 'analyst', 'Academic/regional analysis', true),
  ('pak_afg_2025', 'abubakr_quetta', NULL, 'osint', 'Regional OSINT', true),
  ('pak_afg_2025', 'TahaSiddiqui', NULL, 'journalist', 'Pakistan journalist', true),
  ('pak_afg_2025', 'BilalSarwary', NULL, 'journalist', 'Afghanistan correspondent', true);

INSERT INTO market_indicators (conflict_id, key, label, unit, display_order, color, is_active)
VALUES
  ('pak_afg_2025', 'pkr_usd', 'Pakistan Rupee (PKR/USD)', 'PKR', 1, '#1565c0', true),
  ('pak_afg_2025', 'regional_stability', 'Regional Stability Index', 'index', 2, '#2e7d32', true);
