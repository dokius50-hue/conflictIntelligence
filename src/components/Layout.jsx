import { Link, useLocation } from 'react-router-dom';

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

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-semibold text-slate-800 tracking-tight">
              Conflict Intelligence
            </Link>
            <div className="flex items-center gap-1 flex-wrap">
              {NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
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
                  to={to}
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
