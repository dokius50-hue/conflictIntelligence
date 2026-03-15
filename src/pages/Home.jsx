import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConflict } from '../contexts/ConflictContext';
import { useConfig } from '../hooks/useConfig';

const DEFAULT_CONFLICT = import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

function adminAuthHeaders() {
  const key = import.meta.env.VITE_ADMIN_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

function navTo(to, conflictId) {
  if (conflictId && conflictId !== DEFAULT_CONFLICT) {
    return `${to}?conflict_id=${encodeURIComponent(conflictId)}`;
  }
  return to;
}

function relativeTime(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
};

function MovementBadges({ label, ids, labelMap, colour }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500 shrink-0">{label}</span>
      {ids.map((id) => (
        <span key={id} className={`rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}>
          {labelMap[id] || id}
        </span>
      ))}
    </div>
  );
}

function DeltaPanel({ conflictId }) {
  const { options, threshold_conditions } = useConfig();
  const [delta, setDelta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);

  const fetchDelta = useCallback(() => {
    setLoading(true);
    fetch(`/api/delta?conflict_id=${encodeURIComponent(conflictId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setDelta(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  useEffect(() => { fetchDelta(); }, [fetchDelta]);

  const markReviewed = () => {
    setMarking(true);
    fetch('/api/delta-mark-reviewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ conflict_id: conflictId }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.error) fetchDelta(); })
      .catch(() => {})
      .finally(() => setMarking(false));
  };

  // Build label maps from config for readable movement display.
  const optionLabelMap = Object.fromEntries((options || []).map((o) => [o.id, o.label || o.id]));
  const conditionLabelMap = Object.fromEntries(
    (threshold_conditions || []).map((c) => [c.id, c.description?.slice(0, 50) || c.id])
  );

  const hasMovements = delta?.movements && Object.values(delta.movements).some((arr) => arr.length > 0);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-800">Since last review</h2>
        {delta && (
          <button
            type="button"
            onClick={markReviewed}
            disabled={marking}
            className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {marking ? 'Marking…' : 'Mark as reviewed'}
          </button>
        )}
      </div>

      {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-3 text-sm text-red-500">Error: {error}</p>}

      {!loading && delta && (
        <>
          <p className="mt-1 text-xs text-slate-400">
            {delta.last_reviewed_at
              ? `Last reviewed ${relativeTime(delta.last_reviewed_at)} — ${new Date(delta.last_reviewed_at).toLocaleString()}`
              : 'No review recorded yet — showing all published events'}
          </p>

          {delta.new_events.length === 0 && !hasMovements && (
            <p className="mt-4 text-sm text-slate-500">Nothing new since last review.</p>
          )}

          {delta.new_events.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                {delta.new_events.length} new event{delta.new_events.length !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-2">
                {delta.new_events.map((ev) => (
                  <li key={ev.id} className="flex flex-wrap items-start gap-2 text-sm">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[ev.confidence] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ev.confidence}
                    </span>
                    <span className="text-slate-800 flex-1">{ev.title}</span>
                    {ev.theatres?.length > 0 && (
                      <span className="text-xs text-slate-400">{ev.theatres.join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasMovements && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Situation model movements</p>
              <MovementBadges label="Executed" ids={delta.movements.options_executed} labelMap={optionLabelMap} colour="bg-green-100 text-green-800" />
              <MovementBadges label="Degraded" ids={delta.movements.options_degraded} labelMap={optionLabelMap} colour="bg-yellow-100 text-yellow-800" />
              <MovementBadges label="Foreclosed" ids={delta.movements.options_foreclosed} labelMap={optionLabelMap} colour="bg-red-100 text-red-800" />
              <MovementBadges label="Unlocked" ids={delta.movements.options_unlocked} labelMap={optionLabelMap} colour="bg-blue-100 text-blue-800" />
              <MovementBadges label="Thresholds" ids={delta.movements.thresholds_advanced} labelMap={conditionLabelMap} colour="bg-purple-100 text-purple-800" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { conflictId } = useConflict();
  const safeConflictId = conflictId ?? DEFAULT_CONFLICT;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Situation Model</h1>
      <p className="mt-2 text-slate-600">
        Structured view of the conflict. Five core views: situation map, event timeline, option elimination, threshold tracker, scenario falsification.
      </p>
      <ul className="mt-4 flex flex-wrap gap-4">
        <li><Link to={navTo('/timeline', safeConflictId)} className="text-blue-600 hover:underline">Event Timeline</Link></li>
        <li><Link to={navTo('/map', safeConflictId)} className="text-blue-600 hover:underline">Situation Map</Link></li>
        <li><Link to={navTo('/options', safeConflictId)} className="text-blue-600 hover:underline">Option Elimination</Link></li>
        <li><Link to={navTo('/thresholds', safeConflictId)} className="text-blue-600 hover:underline">Threshold Tracker</Link></li>
        <li><Link to={navTo('/scenarios', safeConflictId)} className="text-blue-600 hover:underline">Scenario Falsification</Link></li>
        <li><Link to={navTo('/admin/queue', safeConflictId)} className="text-blue-600 hover:underline">Event Queue</Link></li>
        <li><Link to={navTo('/admin/tweets', safeConflictId)} className="text-blue-600 hover:underline">Tweet Queue</Link></li>
      </ul>
      <DeltaPanel conflictId={safeConflictId} />
    </div>
  );
}
