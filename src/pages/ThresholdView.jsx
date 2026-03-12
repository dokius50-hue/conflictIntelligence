import { useThresholds } from '../hooks/useThresholds';

function ProximityBar({ ratio }) {
  const pct = Math.round(ratio * 100);
  const color =
    pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-400' : pct >= 25 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>Proximity to threshold</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CONDITION_STATUS_STYLE = {
  met: 'text-green-700',
  unmet: 'text-slate-500',
  no_longer_applicable: 'text-slate-300 line-through',
};

const CONDITION_STATUS_ICON = {
  met: '✓',
  unmet: '○',
  no_longer_applicable: '–',
};

export default function ThresholdView() {
  const { thresholds, loading, error } = useThresholds();

  if (loading) return <p className="text-slate-600">Loading thresholds…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Threshold Proximity Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lines not yet crossed. Each bar shows how many conditions have been met. Crossing a
          threshold triggers cascading consequences across the system.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {thresholds.map(({ threshold, conditions, metCount, totalCount, proximityRatio, nextUnmet }) => {
          const isCrossed = threshold.status === 'crossed';
          return (
            <div
              key={threshold.id}
              className={`rounded-lg border p-4 ${
                isCrossed
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800">{threshold.label}</h3>
                {isCrossed && (
                  <span className="shrink-0 rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    CROSSED
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{threshold.description}</p>

              <ProximityBar ratio={proximityRatio} />

              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Conditions ({metCount}/{totalCount} met)
              </p>
              <ul className="mt-1 space-y-1">
                {(conditions || []).map((c) => (
                  <li
                    key={c.id}
                    className={`flex items-start gap-1.5 text-xs ${CONDITION_STATUS_STYLE[c.status] || 'text-slate-600'}`}
                  >
                    <span className="mt-0.5 font-mono font-bold">
                      {CONDITION_STATUS_ICON[c.status] || '○'}
                    </span>
                    <span>{c.description}</span>
                  </li>
                ))}
              </ul>

              {nextUnmet && (
                <div className="mt-3 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                  <span className="font-semibold">Watch: </span>
                  {nextUnmet.description}
                </div>
              )}

              {threshold.cascade_consequences?.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                    If crossed → {threshold.cascade_consequences.length} consequences
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700">
                    {threshold.cascade_consequences.map((c, i) => (
                      <li key={i} className="flex gap-1">
                        <span>→</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
      {thresholds.length === 0 && (
        <p className="text-slate-500">No thresholds configured.</p>
      )}
    </div>
  );
}
