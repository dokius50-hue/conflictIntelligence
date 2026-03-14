import { useEffect, useState } from 'react';
import { useConflict } from '../contexts/ConflictContext';

const API = '/api';
const DEFAULT_CONFLICT = import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

function adminAuthHeaders() {
  const key = import.meta.env.VITE_ADMIN_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

export default function ConfigEditor() {
  const { conflictId } = useConflict();
  const safeConflictId = conflictId ?? DEFAULT_CONFLICT;
  const [tab, setTab] = useState('actors');
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Config Editor</h1>
      <p className="mt-1 text-slate-600">Edit actors, theatres, options, and threshold conditions for the current conflict.</p>
      <div className="mt-4 flex gap-2 border-b border-slate-200">
        {['actors', 'theatres', 'options', 'thresholds'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm capitalize ${
              tab === t ? 'border-b-2 border-slate-800 font-medium text-slate-800' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'actors' && <ActorsPanel conflictId={safeConflictId} />}
        {tab === 'theatres' && <TheatresPanel conflictId={safeConflictId} />}
        {tab === 'options' && <OptionsPanel conflictId={safeConflictId} />}
        {tab === 'thresholds' && <ThresholdsPanel conflictId={safeConflictId} />}
      </div>
    </div>
  );
}

function ActorsPanel({ conflictId }) {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetch(`${API}/config-actors?conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setActors(data.actors || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  const updateField = (id, field, value) => {
    setActors((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const save = (actor) => {
    fetch(`${API}/config-actors?conflict_id=${encodeURIComponent(conflictId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ id: actor.id, updates: { name: actor.name, short_name: actor.short_name, side: actor.side, color: actor.color, is_active: actor.is_active } }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setActors(data.actors || []);
          setWarnings(data.warnings || []);
        }
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-slate-600">Loading actors…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="font-medium">Reference warnings (validate_config_references)</p>
          <ul className="mt-1 list-disc pl-4">
            {warnings.map((w, idx) => (
              <li key={idx}>{JSON.stringify(w)}</li>
            ))}
          </ul>
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">ID</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Name</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Short</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Side</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Color</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Active</th>
            <th className="px-2 py-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {actors.map((a) => (
            <tr key={a.id}>
              <td className="px-2 py-1 text-xs text-slate-500">{a.id}</td>
              <td className="px-2 py-1">
                <input
                  value={a.name || ''}
                  onChange={(e) => updateField(a.id, 'name', e.target.value)}
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={a.short_name || ''}
                  onChange={(e) => updateField(a.id, 'short_name', e.target.value)}
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={a.side || ''}
                  onChange={(e) => updateField(a.id, 'side', e.target.value)}
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={a.color || ''}
                  onChange={(e) => updateField(a.id, 'color', e.target.value)}
                  className="w-24 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={a.is_active !== false}
                  onChange={(e) => updateField(a.id, 'is_active', e.target.checked)}
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  onClick={() => save(a)}
                  className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TheatresPanel({ conflictId }) {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetch(`${API}/config-theatres?conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setTheatres(data.theatres || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  const updateField = (id, field, value) => {
    setTheatres((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const save = (theatre) => {
    const toNumber = (v) => (v === '' || v == null ? null : Number(v));
    fetch(`${API}/config-theatres?conflict_id=${encodeURIComponent(conflictId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({
        id: theatre.id,
        updates: {
          label: theatre.label,
          color: theatre.color,
          accent: theatre.accent,
          bounds_north: toNumber(theatre.bounds_north),
          bounds_south: toNumber(theatre.bounds_south),
          bounds_east: toNumber(theatre.bounds_east),
          bounds_west: toNumber(theatre.bounds_west),
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTheatres(data.theatres || []);
          setWarnings(data.warnings || []);
        }
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-slate-600">Loading theatres…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="font-medium">Reference warnings (validate_config_references)</p>
          <ul className="mt-1 list-disc pl-4">
            {warnings.map((w, idx) => (
              <li key={idx}>{JSON.stringify(w)}</li>
            ))}
          </ul>
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">ID</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Label</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Color</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Accent</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Bounds N</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Bounds S</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Bounds E</th>
            <th className="px-2 py-1 text-left text-xs font-medium text-slate-500">Bounds W</th>
            <th className="px-2 py-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {theatres.map((t) => (
            <tr key={t.id}>
              <td className="px-2 py-1 text-xs text-slate-500">{t.id}</td>
              <td className="px-2 py-1">
                <input
                  value={t.label || ''}
                  onChange={(e) => updateField(t.id, 'label', e.target.value)}
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.color || ''}
                  onChange={(e) => updateField(t.id, 'color', e.target.value)}
                  className="w-24 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.accent || ''}
                  onChange={(e) => updateField(t.id, 'accent', e.target.value)}
                  className="w-24 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.bounds_north ?? ''}
                  onChange={(e) => updateField(t.id, 'bounds_north', e.target.value)}
                  className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.bounds_south ?? ''}
                  onChange={(e) => updateField(t.id, 'bounds_south', e.target.value)}
                  className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.bounds_east ?? ''}
                  onChange={(e) => updateField(t.id, 'bounds_east', e.target.value)}
                  className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  value={t.bounds_west ?? ''}
                  onChange={(e) => updateField(t.id, 'bounds_west', e.target.value)}
                  className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  onClick={() => save(t)}
                  className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const OPTION_STATUS_STYLES = {
  available: 'border-green-300 bg-green-50 text-green-800',
  executed: 'border-blue-300 bg-blue-50 text-blue-800',
  degraded: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  foreclosed: 'border-red-300 bg-red-100 text-red-700',
};

const INTENSITY_DOTS = (n) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`inline-block h-2 w-2 rounded-full mr-0.5 ${i < (n ?? 0) ? 'bg-red-500' : 'bg-slate-200'}`} />
  ));

const ACTOR_COLORS = { iran: '#e53935', usa: '#1565c0', gcc: '#2e7d32' };

function OptionsPanel({ conflictId }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetch(`${API}/config-options?conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.options || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  const updateStatus = (id, status) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const save = (opt) => {
    fetch(`${API}/config-options?conflict_id=${encodeURIComponent(conflictId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ id: opt.id, updates: { status: opt.status } }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setOptions(data.options || []);
          setWarnings(data.warnings || []);
        }
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-slate-600">Loading options…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const byActor = options.reduce((acc, o) => {
    const aid = o.actor_id || '_';
    if (!acc[aid]) acc[aid] = [];
    acc[aid].push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="font-medium">Reference warnings</p>
          <ul className="mt-1 list-disc pl-4">
            {warnings.map((w, idx) => (
              <li key={idx}>{JSON.stringify(w)}</li>
            ))}
          </ul>
        </div>
      )}
      {Object.entries(byActor).sort(([a], [b]) => a.localeCompare(b)).map(([actorId, opts]) => (
        <div key={actorId} className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800" style={{ color: ACTOR_COLORS[actorId] || '#555' }}>
            {actorId.toUpperCase()}
          </h3>
          <ul className="space-y-2">
            {opts.sort((a, b) => (a.intensity ?? 0) - (b.intensity ?? 0)).map((opt) => {
              const style = OPTION_STATUS_STYLES[opt.status] || 'border-slate-200 bg-white text-slate-800';
              return (
                <li key={opt.id} className={`flex items-center gap-3 rounded border p-2 text-sm ${style}`}>
                  <span className="text-xs text-slate-500 shrink-0">{opt.id}</span>
                  <span className="font-medium min-w-0 truncate">{opt.label}</span>
                  <span className="flex shrink-0">{INTENSITY_DOTS(opt.intensity)}</span>
                  <select
                    value={opt.status}
                    onChange={(e) => updateStatus(opt.id, e.target.value)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs"
                  >
                    <option value="available">Available</option>
                    <option value="executed">Executed</option>
                    <option value="degraded">Degraded</option>
                    <option value="foreclosed">Foreclosed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => save(opt)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white hover:bg-slate-900 shrink-0"
                  >
                    Save
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {options.length === 0 && <p className="text-slate-500">No options configured.</p>}
    </div>
  );
}

function ThresholdsPanel({ conflictId }) {
  const [thresholds, setThresholds] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch(`${API}/config-threshold-conditions?conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setThresholds(data.thresholds || []);
        setConditions(data.conditions || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  const toggle = (cond) => {
    const nextStatus = cond.status === 'met' ? 'unmet' : 'met';
    fetch(`${API}/config-threshold-conditions?conflict_id=${encodeURIComponent(conflictId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ id: cond.id, updates: { status: nextStatus } }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setThresholds(data.thresholds || []);
          setConditions(data.conditions || []);
        }
      })
      .catch((e) => setError(e.message));
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <p className="text-slate-600">Loading threshold conditions…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-3">
      {thresholds.map((t) => {
        const conds = conditions.filter((c) => c.threshold_id === t.id).sort((a, b) => a.display_order - b.display_order);
        const isExpanded = expanded[t.id] !== false;
        const metCount = conds.filter((c) => c.status === 'met').length;
        const isCrossed = t.status === 'crossed';

        return (
          <div key={t.id} className={`rounded-lg border p-4 ${isCrossed ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <button
              type="button"
              onClick={() => toggleExpand(t.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="font-semibold text-slate-800">{t.label}</h3>
              <span className="text-xs text-slate-500">
                {metCount}/{conds.length} met
                {isCrossed && ' · CROSSED'}
              </span>
            </button>
            {isExpanded && (
              <ul className="mt-3 space-y-2">
                {conds.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 p-2 text-sm">
                    <span className={c.status === 'met' ? 'text-green-700' : 'text-slate-600'}>{c.description}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.status === 'met' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                      {c.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.status === 'met'
                          ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {c.status === 'met' ? 'Mark Unmet' : 'Mark Met'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {thresholds.length === 0 && <p className="text-slate-500">No thresholds configured.</p>}
    </div>
  );
}

