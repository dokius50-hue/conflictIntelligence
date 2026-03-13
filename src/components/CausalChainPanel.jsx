import { useCausalChain } from '../hooks/useCausalChain';

const OPTION_STATUS_STYLES = {
  executed: 'border-blue-300 bg-blue-50 text-blue-800',
  degraded: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  foreclosed: 'border-red-300 bg-red-100 text-red-700',
  available: 'border-green-300 bg-green-50 text-green-800',
};

const ACTOR_COLORS = {
  iran: '#e53935',
  usa: '#1565c0',
  gcc: '#2e7d32',
  israel: '#f57f17',
  russia: '#6a1b9a',
  china: '#c62828',
};

function ActorDot({ actorId }) {
  const color = ACTOR_COLORS[actorId] || '#555';
  return (
    <span
      className="inline-block h-2 w-2 rounded-full mr-1 shrink-0 mt-1"
      style={{ backgroundColor: color }}
    />
  );
}

function OptionList({ title, options, statusKey }) {
  if (!options || options.length === 0) return null;
  const style = OPTION_STATUS_STYLES[statusKey] || 'border-slate-200 bg-white text-slate-800';
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="space-y-1">
        {options.map((opt) => (
          <li key={opt.id} className={`rounded border px-2 py-1.5 text-xs ${style}`}>
            <div className="flex items-start gap-1">
              <ActorDot actorId={opt.actor_id} />
              <span>
                <span className="font-medium">{opt.label}</span>
                {opt.actor_id && (
                  <span className="ml-1.5 text-xs opacity-60 capitalize">{opt.actor_id}</span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThresholdProgress({ threshold }) {
  const total = threshold.conditionsTotal || 0;
  const satisfied = threshold.conditionsSatisfied || 0;
  const pct = total > 0 ? Math.round((satisfied / total) * 100) : 0;
  return (
    <li className="rounded border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-orange-900">{threshold.label || threshold.id}</span>
        <span className="shrink-0 text-orange-600">
          {satisfied}/{total} conditions
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-orange-200">
        <div
          className="h-1.5 rounded-full bg-orange-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {threshold.status === 'crossed' && (
        <p className="mt-1 font-semibold text-red-700">CROSSED</p>
      )}
    </li>
  );
}

/**
 * Shows the full causal impact of a single published event.
 * @param {object} props
 * @param {object} props.event - The published event object (must have .id and .title).
 * @param {function} props.onClose - Called when the user dismisses the panel.
 */
export default function CausalChainPanel({ event, onClose }) {
  const { data, loading, error } = useCausalChain(event?.id);

  const hasOptionChanges =
    data &&
    (data.optionChanges?.executed?.length ||
      data.optionChanges?.degraded?.length ||
      data.optionChanges?.foreclosed?.length ||
      data.optionChanges?.unlocked?.length);

  const hasThresholds = data?.thresholdsAdvanced?.length > 0;
  const hasScenarios = data?.scenariosAtRisk?.length > 0;
  const isEmpty = data && !hasOptionChanges && !hasThresholds && !hasScenarios;

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Causal Chain
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-slate-800 leading-snug">
            {event.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          aria-label="Close causal chain panel"
        >
          ✕ Close
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Tracing causal chain…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {isEmpty && (
        <p className="text-sm text-slate-500">
          No option, threshold, or scenario effects recorded for this event.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {hasOptionChanges && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Option State Changes
              </p>
              <OptionList title="Executed" options={data.optionChanges.executed} statusKey="executed" />
              <OptionList title="Degraded" options={data.optionChanges.degraded} statusKey="degraded" />
              <OptionList title="Foreclosed" options={data.optionChanges.foreclosed} statusKey="foreclosed" />
              <OptionList title="Unlocked" options={data.optionChanges.unlocked} statusKey="available" />
            </section>
          )}

          {hasThresholds && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thresholds Advanced
              </p>
              <ul className="space-y-1.5">
                {data.thresholdsAdvanced.map((t) => (
                  <ThresholdProgress key={t.id} threshold={t} />
                ))}
              </ul>
            </section>
          )}

          {hasScenarios && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scenarios at Risk
              </p>
              <ul className="space-y-1">
                {data.scenariosAtRisk.map((s) => (
                  <li
                    key={s.id}
                    className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800"
                  >
                    <span className="font-medium">{s.label || s.id}</span>
                    {s.description && (
                      <p className="mt-0.5 opacity-70">{s.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
