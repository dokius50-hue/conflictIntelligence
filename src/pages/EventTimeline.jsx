import { useEvents } from '../hooks/useEvents';

/**
 * @param {object} props
 * @param {string[]} [props.theatres]       - filter events to these theatre IDs
 * @param {string|null} [props.location_id] - filter events to this location ID
 * @param {function} [props.onEventClick]   - (event) => void — fired when an event is clicked
 * @param {string|null} [props.activeEventId] - event ID to highlight
 * @param {boolean} [props.standalone]      - if true, show section heading
 */
export default function EventTimeline({
  theatres,
  location_id,
  onEventClick,
  activeEventId = null,
  standalone = true,
}) {
  const { events, loading, error } = useEvents({ theatres, location_id, limit: 100 });
  if (loading) return <p className="text-slate-600">Loading timeline…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <section>
      {standalone && (
        <h2 className="text-lg font-semibold text-slate-800">Event Timeline</h2>
      )}
      <ul className="mt-2 space-y-2">
        {events.map((e) => {
          const isActive = activeEventId === e.id;
          return (
            <li
              key={e.id}
              className={`rounded border p-3 text-sm cursor-pointer transition-colors ${
                isActive
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => onEventClick?.(e)}
            >
              <time className="text-slate-500">{e.reported_at?.slice(0, 10)}</time>
              <span className="ml-2 font-medium">{e.title}</span>
              {e.location_id && (
                <span className="ml-2 rounded bg-slate-100 px-1 text-xs text-slate-500">
                  {e.location_id}
                </span>
              )}
              {e.theatres?.length > 0 && (
                <span className="ml-1 rounded bg-blue-50 px-1 text-xs text-blue-600">
                  {e.theatres.join(', ')}
                </span>
              )}
              <p className="mt-1 text-slate-600">{e.description}</p>
            </li>
          );
        })}
      </ul>
      {events.length === 0 && <p className="text-slate-500">No events for this selection.</p>}
    </section>
  );
}
