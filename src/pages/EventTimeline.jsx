import { useEvents } from '../hooks/useEvents';

export default function EventTimeline() {
  const { events, loading, error } = useEvents({ limit: 100 });
  if (loading) return <p className="text-slate-600">Loading timeline…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800">Event Timeline</h2>
      <ul className="mt-2 space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <time className="text-slate-500">{e.reported_at?.slice(0, 10)}</time>
            <span className="ml-2 font-medium">{e.title}</span>
            <p className="mt-1 text-slate-600">{e.description}</p>
          </li>
        ))}
      </ul>
      {events.length === 0 && <p className="text-slate-500">No events yet.</p>}
    </section>
  );
}
