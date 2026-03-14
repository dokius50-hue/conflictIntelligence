import { Link } from 'react-router-dom';
import { useConflict } from '../contexts/ConflictContext';

const DEFAULT_CONFLICT = import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

function navTo(to, conflictId) {
  if (conflictId && conflictId !== DEFAULT_CONFLICT) {
    return `${to}?conflict_id=${encodeURIComponent(conflictId)}`;
  }
  return to;
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
        <li><Link to={navTo('/admin/queue', safeConflictId)} className="text-blue-600 hover:underline">Admin Queue</Link></li>
        <li><Link to={navTo('/admin/tweets', safeConflictId)} className="text-blue-600 hover:underline">Tweet Queue</Link></li>
      </ul>
    </div>
  );
}
