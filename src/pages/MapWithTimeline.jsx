import { useState } from 'react';
import SituationMap from './SituationMap';
import EventTimeline from './EventTimeline';

/**
 * B2: Map–Timeline interaction page.
 *
 * Clicking a theatre rectangle filters the timeline to that theatre.
 * Clicking a location marker filters the timeline to that location.
 * Clicking an event in the timeline highlights the associated location/theatre on the map.
 * A "Clear filter" button resets to all events.
 */
export default function MapWithTimeline() {
  const [filterTheatre, setFilterTheatre] = useState(null);
  const [filterLocation, setFilterLocation] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [activeLocation, setActiveLocation] = useState(null);
  const [activeTheatre, setActiveTheatre] = useState(null);

  function handleTheatreClick(theatreId) {
    setFilterTheatre(theatreId);
    setFilterLocation(null);
    setActiveTheatre(theatreId);
    setActiveLocation(null);
    setActiveEventId(null);
  }

  function handleLocationClick(locationId) {
    setFilterLocation(locationId);
    setFilterTheatre(null);
    setActiveLocation(locationId);
    setActiveTheatre(null);
    setActiveEventId(null);
  }

  function handleEventClick(event) {
    setActiveEventId(event.id);
    if (event.location_id) {
      setActiveLocation(event.location_id);
      setActiveTheatre(null);
    } else if (event.theatres?.length) {
      setActiveTheatre(event.theatres[0]);
      setActiveLocation(null);
    }
  }

  function clearFilter() {
    setFilterTheatre(null);
    setFilterLocation(null);
    setActiveTheatre(null);
    setActiveLocation(null);
    setActiveEventId(null);
  }

  const hasFilter = filterTheatre || filterLocation;

  const filterLabel = filterTheatre
    ? `Theatre: ${filterTheatre}`
    : filterLocation
    ? `Location: ${filterLocation}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Situation Map</h1>
        {hasFilter && (
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Filtered: {filterLabel}
            </span>
            <button
              onClick={clearFilter}
              className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-300"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Click a theatre or location to filter events. Click an event to highlight it on the map.
      </p>

      <SituationMap
        standalone={false}
        onTheatreClick={handleTheatreClick}
        onLocationClick={handleLocationClick}
        activeTheatre={activeTheatre}
        activeLocation={activeLocation}
      />

      <div className="border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Event Timeline</h2>
          {!hasFilter && (
            <span className="text-xs text-slate-400">(all events — click map to filter)</span>
          )}
        </div>
        <EventTimeline
          standalone={false}
          theatres={filterTheatre ? [filterTheatre] : undefined}
          location_id={filterLocation || undefined}
          onEventClick={handleEventClick}
          activeEventId={activeEventId}
        />
      </div>
    </div>
  );
}
