import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Situation Model</h1>
      <p className="mt-2 text-slate-600">
        Structured view of the conflict. Five core views: situation map, event timeline, option elimination, threshold tracker, scenario falsification.
      </p>
      <ul className="mt-4 flex flex-wrap gap-4">
        <li><Link to="/timeline" className="text-blue-600 hover:underline">Event Timeline</Link></li>
        <li><Link to="/admin/queue" className="text-blue-600 hover:underline">Admin Queue</Link></li>
        <li><Link to="/admin/tweets" className="text-blue-600 hover:underline">Tweet Queue</Link></li>
      </ul>
    </div>
  );
}
