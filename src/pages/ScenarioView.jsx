import { useScenarios } from '../hooks/useScenarios';

const VIABILITY_STYLE = {
  viable: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    badge: 'bg-green-500',
    text: 'VIABLE',
  },
  falsified: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    badge: 'bg-red-500',
    text: 'FALSIFIED',
  },
};

const CONDITION_ICON = {
  holding: { icon: '✓', cls: 'text-green-600' },
  violated: { icon: '✗', cls: 'text-red-600' },
};

export default function ScenarioView() {
  const { scenarios, loading, error } = useScenarios();

  if (loading) return <p className="text-slate-600">Loading scenarios…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const viable = scenarios.filter((s) => s.viabilityStatus === 'viable');
  const falsified = scenarios.filter((s) => s.viabilityStatus === 'falsified');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Scenario Falsification Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scenarios are ruled out when a survival condition is violated — not probability-adjusted.
          Scenarios that survive falsification longest are the ones worth taking seriously.
        </p>
      </div>

      {viable.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Still Viable ({viable.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {viable.map((s) => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        </section>
      )}

      {falsified.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Falsified ({falsified.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {falsified.map((s) => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        </section>
      )}

      {scenarios.length === 0 && <p className="text-slate-500">No scenarios configured.</p>}
    </div>
  );
}

function ScenarioCard({ scenario }) {
  const style = VIABILITY_STYLE[scenario.viabilityStatus] || VIABILITY_STYLE.viable;
  const holding = scenario.conditions?.filter((c) => c.status === 'holding') || [];
  const violated = scenario.conditions?.filter((c) => c.status === 'violated') || [];

  return (
    <div className={`rounded-lg border p-4 ${style.border} ${style.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{scenario.label}</h3>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold text-white ${style.badge}`}
        >
          {style.text}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{scenario.description}</p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Survival conditions ({holding.length}/{scenario.conditions?.length || 0} holding)
      </p>
      <ul className="mt-1 space-y-1">
        {(scenario.conditions || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((c) => {
            const ci = CONDITION_ICON[c.status] || { icon: '?', cls: 'text-slate-500' };
            return (
              <li key={c.id} className={`flex items-start gap-1.5 text-xs ${ci.cls}`}>
                <span className="mt-0.5 font-bold">{ci.icon}</span>
                <span>{c.description}</span>
              </li>
            );
          })}
      </ul>

      {violated.length > 0 && scenario.viabilityStatus === 'falsified' && (
        <div className="mt-3 rounded bg-red-100 border border-red-300 p-2 text-xs text-red-800">
          <span className="font-semibold">Falsified by: </span>
          {violated.map((c) => c.description).join('; ')}
        </div>
      )}

      {scenario.notes && (
        <p className="mt-2 text-xs italic text-slate-500">{scenario.notes}</p>
      )}
    </div>
  );
}
