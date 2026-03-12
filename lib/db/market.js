/**
 * Query tool: market_indicators, market_snapshots, market_snapshot_values.
 * Returns indicators with time-series values ordered by snapshot date.
 * No analytical logic — rendering decisions live in components.
 */
const { getSupabase } = require('../supabase');

/**
 * Returns market indicators and their snapshot time-series for a conflict.
 * Shape: [{ id, key, label, unit, color, display_order, series: [{date, value, notes}] }]
 */
async function getMarketTimeSeries(conflictId) {
  const supabase = getSupabase();

  const [{ data: indicators, error: ie }, { data: snapshots, error: se }] = await Promise.all([
    supabase
      .from('market_indicators')
      .select('*')
      .eq('conflict_id', conflictId)
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('market_snapshots')
      .select('id, snapshot_date')
      .eq('conflict_id', conflictId)
      .order('snapshot_date'),
  ]);

  if (ie) throw ie;
  if (se) throw se;
  if (!indicators?.length || !snapshots?.length) return [];

  const snapshotIds = snapshots.map((s) => s.id);
  const { data: values, error: ve } = await supabase
    .from('market_snapshot_values')
    .select('*')
    .in('snapshot_id', snapshotIds);
  if (ve) throw ve;

  const snapshotById = new Map(snapshots.map((s) => [s.id, s]));

  return indicators.map((ind) => {
    const series = (values || [])
      .filter((v) => v.indicator_id === ind.id)
      .map((v) => ({
        date: snapshotById.get(v.snapshot_id)?.snapshot_date,
        value: Number(v.value),
        notes: v.notes,
      }))
      .filter((v) => v.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    return { ...ind, series };
  });
}

module.exports = { getMarketTimeSeries };
