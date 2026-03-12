import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="font-semibold text-slate-800">
            Conflict Intelligence
          </Link>
          <nav className="flex gap-4">
            <Link to="/timeline" className="text-sm text-slate-600 hover:text-slate-900">
              Timeline
            </Link>
            <Link to="/admin/queue" className="text-sm text-slate-600 hover:text-slate-900">
              Admin Queue
            </Link>
            <Link to="/admin/tweets" className="text-sm text-slate-600 hover:text-slate-900">
              Tweet Queue
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
