import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Simple default icon fix for Leaflet in bundlers
// (Vite will copy these from node_modules/leaflet/dist/images)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/marker-icon-2x.png',
  iconUrl: 'leaflet/marker-icon.png',
  shadowUrl: 'leaflet/marker-shadow.png',
});

const API = '/api';

const DEFAULT_CENTER = [26, 56]; // Gulf region
const DEFAULT_ZOOM = 5;

/**
 * @param {object} props
 * @param {function} [props.onTheatreClick]  - (theatreId: string) => void
 * @param {function} [props.onLocationClick] - (locationId: string) => void
 * @param {string|null} [props.activeTheatre]  - theatre ID to highlight
 * @param {string|null} [props.activeLocation] - location ID to highlight
 * @param {boolean} [props.standalone] - if true, show page heading
 */
export default function SituationMap({
  onTheatreClick,
  onLocationClick,
  activeTheatre = null,
  activeLocation = null,
  standalone = true,
}) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/config`)
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setError(data.error || null);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (!config && !error) return <p className="text-slate-600">Loading map…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const theatres = config?.theatres || [];
  const locations = config?.locations || [];

  const boundsFromTheatres = theatres
    .map((t) => {
      if (
        t.bounds_north == null ||
        t.bounds_south == null ||
        t.bounds_east == null ||
        t.bounds_west == null
      )
        return null;
      return [
        [t.bounds_south, t.bounds_west],
        [t.bounds_north, t.bounds_east],
      ];
    })
    .filter(Boolean);

  const initialCenter = boundsFromTheatres.length
    ? [
        (boundsFromTheatres[0][0][0] + boundsFromTheatres[0][1][0]) / 2,
        (boundsFromTheatres[0][0][1] + boundsFromTheatres[0][1][1]) / 2,
      ]
    : DEFAULT_CENTER;

  return (
    <div className="space-y-3">
      {standalone && (
        <>
          <h1 className="text-2xl font-semibold text-slate-800">Situation Map</h1>
          <p className="text-slate-600">
            Click a theatre or location to filter the event timeline below.
          </p>
        </>
      )}
      <div className="mt-2 h-[500px] w-full overflow-hidden rounded border border-slate-200">
        <MapContainer center={initialCenter} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {theatres.map((t) => {
            if (
              t.bounds_north == null ||
              t.bounds_south == null ||
              t.bounds_east == null ||
              t.bounds_west == null
            )
              return null;
            const rectBounds = [
              [t.bounds_south, t.bounds_west],
              [t.bounds_north, t.bounds_east],
            ];
            const isActive = activeTheatre === t.id;
            return (
              <Rectangle
                key={t.id}
                bounds={rectBounds}
                pathOptions={{
                  color: isActive ? '#e53935' : (t.color || '#0d47a1'),
                  weight: isActive ? 3 : 2,
                  fillOpacity: isActive ? 0.22 : 0.1,
                }}
                eventHandlers={{
                  click: () => onTheatreClick?.(t.id),
                }}
              >
                <Popup>
                  <strong>{t.label}</strong>
                  {onTheatreClick && (
                    <button
                      className="ml-2 text-xs text-blue-600 underline"
                      onClick={() => onTheatreClick(t.id)}
                    >
                      Filter events
                    </button>
                  )}
                </Popup>
              </Rectangle>
            );
          })}
          {locations.map((loc) => {
            const isActive = activeLocation === loc.id;
            const icon = isActive
              ? L.divIcon({
                  className: '',
                  html: `<div style="width:18px;height:18px;border-radius:50%;background:#e53935;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })
              : undefined;
            return (
              <Marker
                key={loc.id}
                position={[loc.lat, loc.lng]}
                icon={icon || undefined}
                eventHandlers={{
                  click: () => onLocationClick?.(loc.id),
                }}
              >
                <Popup>
                  <div>
                    <strong>{loc.name}</strong>
                    {loc.type && <div className="text-xs text-slate-600">Type: {loc.type}</div>}
                    {loc.theatre_id && (
                      <div className="text-xs text-slate-600">Theatre: {loc.theatre_id}</div>
                    )}
                    {onLocationClick && (
                      <button
                        className="mt-1 text-xs text-blue-600 underline"
                        onClick={() => onLocationClick(loc.id)}
                      >
                        Filter events
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

