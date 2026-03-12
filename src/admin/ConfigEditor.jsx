import { useEffect, useState } from 'react';

const API = '/api';

function adminAuthHeaders() {
  const key = import.meta.env.VITE_ADMIN_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

export default function ConfigEditor() {
  const [tab, setTab] = useState('actors');
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Config Editor</h1>
      <p className="mt-1 text-slate-600">Edit actors and theatres for the current conflict.</p>
      <div className="mt-4 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('actors')}
          className={`px-3 py-1.5 text-sm ${
            tab === 'actors' ? 'border-b-2 border-slate-800 font-medium text-slate-800' : 'text-slate-500'
          }`}
        >
          Actors
        </button>
        <button
          type="button"
          onClick={() => setTab('theatres')}
          className={`px-3 py-1.5 text-sm ${
            tab === 'theatres' ? 'border-b-2 border-slate-800 font-medium text-slate-800' : 'text-slate-500'
          }`}
        >
          Theatres
        </button>
      </div>
      <div className="mt-4">
        {tab === 'actors' ? <ActorsPanel /> : <TheatresPanel />}
      </div>
    </div>
  );
}

function ActorsPanel() {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetch(`${API}/config-actors`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setActors(data.actors || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (id, field, value) => {
    setActors((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const save = (actor) => {
    fetch(`${API}/config-actors`, {
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

function TheatresPanel() {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    fetch(`${API}/config-theatres`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setTheatres(data.theatres || []);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (id, field, value) => {
    setTheatres((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const save = (theatre) => {
    const toNumber = (v) => (v === '' || v == null ? null : Number(v));
    fetch(`${API}/config-theatres`, {
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

