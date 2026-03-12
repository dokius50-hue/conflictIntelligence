import { useOptions } from '../hooks/useOptions';

const STATUS_STYLES = {
  available: 'border-green-300 bg-green-50 text-green-800',
  locked: 'border-slate-300 bg-slate-100 text-slate-500',
  executed: 'border-blue-300 bg-blue-50 text-blue-800',
  degraded: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  foreclosed: 'border-red-300 bg-red-100 text-red-700 line-through opacity-60',
};

const STATUS_LABEL = {
  available: 'Available',
  locked: 'Locked — prereqs unmet',
  executed: 'Executed',
  degraded: 'Degraded',
  foreclosed: 'Foreclosed',
};

const INTENSITY_DOTS = (n) =>
  Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-2 w-2 rounded-full mr-0.5 ${i < n ? 'bg-red-500' : 'bg-slate-200'}`}
    />
  ));

const ACTOR_COLORS = {
  iran: '#e53935',
  usa: '#1565c0',
  gcc: '#2e7d32',
};

function OptionCard({ opt }) {
  const style = STATUS_STYLES[opt.effectiveStatus] || STATUS_STYLES.available;
  return (
    <li className={`rounded border p-3 text-sm ${style}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{opt.label}</span>
        <span className="flex shrink-0 items-center gap-1">
          {INTENSITY_DOTS(opt.intensity)}
        </span>
      </div>
      {opt.description && (
        <p className="mt-1 text-xs opacity-80">{opt.description}</p>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs font-medium">
          {STATUS_LABEL[opt.effectiveStatus] || opt.effectiveStatus}
        </span>
        {opt.escalation_direction && (
          <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
            {opt.escalation_direction}
          </span>
        )}
        {opt.effectiveStatus === 'locked' && opt.prerequisites?.length > 0 && (
          <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
            requires: {opt.prerequisites.join(', ')}
          </span>
        )}
      </div>
    </li>
  );
}

function ActorBlock({ actorId, residual, allOptions }) {
  const color = ACTOR_COLORS[actorId] || '#555';
  const executed = allOptions.filter(
    (o) => o.actor_id === actorId && o.status === 'executed'
  );
  const available = residual.filter((o) => o.effectiveStatus === 'available');
  const locked = residual.filter((o) => o.effectiveStatus === 'locked');
  const degraded = residual.filter((o) => o.effectiveStatus === 'degraded');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3
        className="mb-3 flex items-center gap-2 text-base font-semibold capitalize"
        style={{ color }}
      >
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {actorId.toUpperCase()}
        <span className="ml-auto text-xs font-normal text-slate-400">
          {available.length} available · {executed.length} executed · {locked.length} locked
        </span>
      </h3>

      {executed.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Executed
          </p>
          <ul className="space-y-1.5">
            {executed.map((o) => (
              <OptionCard key={o.id} opt={{ ...o, effectiveStatus: 'executed' }} />
            ))}
          </ul>
        </div>
      )}

      {degraded.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Degraded
          </p>
          <ul className="space-y-1.5">
            {degraded.map((o) => <OptionCard key={o.id} opt={o} />)}
          </ul>
        </div>
      )}

      {available.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Available
          </p>
          <ul className="space-y-1.5">
            {available.map((o) => <OptionCard key={o.id} opt={o} />)}
          </ul>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Locked
          </p>
          <ul className="space-y-1.5">
            {locked.map((o) => <OptionCard key={o.id} opt={o} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function OptionView() {
  const { data, loading, error } = useOptions();

  if (loading) return <p className="text-slate-600">Loading option menus…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const { options = [], residualByActor = {} } = data || {};
  const actorIds = [...new Set(options.map((o) => o.actor_id))].sort();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Option Elimination View</h1>
        <p className="mt-1 text-sm text-slate-500">
          Residual option space — what each actor can still credibly do. Intensity 1 = least
          escalatory, 5 = most. Locked options have unmet prerequisites.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {actorIds.map((aid) => (
          <ActorBlock
            key={aid}
            actorId={aid}
            residual={residualByActor[aid] || []}
            allOptions={options}
          />
        ))}
      </div>
    </div>
  );
}
