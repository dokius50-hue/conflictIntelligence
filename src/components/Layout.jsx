import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConflict } from '../contexts/ConflictContext';

const DEFAULT_CONFLICT = import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

const NAV = [
  { to: '/timeline', label: 'Timeline' },
  { to: '/map', label: 'Map' },
  { to: '/options', label: 'Options' },
  { to: '/thresholds', label: 'Thresholds' },
  { to: '/scenarios', label: 'Scenarios' },
  { to: '/perspectives', label: 'Perspectives' },
  { to: '/market', label: 'Market' },
];

const ADMIN_NAV = [
  { to: '/admin/queue', label: 'Event Queue' },
  { to: '/admin/tweets', label: 'Tweet Queue' },
  { to: '/admin/config', label: 'Config' },
];

function navTo(to, conflictId) {
  if (conflictId && conflictId !== DEFAULT_CONFLICT) {
    const sep = to.includes('?') ? '&' : '?';
    return `${to}${sep}conflict_id=${encodeURIComponent(conflictId)}`;
  }
  return to;
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { conflictId, setConflictId } = useConflict();
  const safeConflictId = conflictId ?? DEFAULT_CONFLICT;
  const [conflicts, setConflicts] = useState([]);
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    fetch('/api/conflicts')
      .then((r) => r.json())
      .then((data) => setConflicts(Array.isArray(data) ? data : []))
      .catch(() => setConflicts([]));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <Link to={navTo('/', conflictId)} className="font-semibold text-slate-800 tracking-tight">
              Conflict Intelligence
            </Link>
            <div className="flex items-center gap-1 flex-wrap">
              {conflicts.length > 1 && (
                <select
                  value={conflicts.some((c) => c.id === safeConflictId) ? safeConflictId : DEFAULT_CONFLICT}
                  onChange={(e) => setConflictId(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 bg-white"
                >
                  {conflicts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.short_name || c.name}
                    </option>
                  ))}
                </select>
              )}
              {NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={navTo(to, safeConflictId)}
                  className={`rounded px-2.5 py-1 text-sm transition-colors ${
                    pathname === to
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <span className="mx-1 text-slate-300">|</span>
              {ADMIN_NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={navTo(to, safeConflictId)}
                  className={`rounded px-2.5 py-1 text-sm transition-colors ${
                    pathname === to
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
