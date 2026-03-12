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

export default function SituationMap() {
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

  // If any theatre has bounds, use the first as initial view; otherwise default Gulf view.
  const initialCenter = boundsFromTheatres.length
    ? [
        (boundsFromTheatres[0][0][0] + boundsFromTheatres[0][1][0]) / 2,
        (boundsFromTheatres[0][0][1] + boundsFromTheatres[0][1][1]) / 2,
      ]
    : DEFAULT_CENTER;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-800">Situation Map</h1>
      <p className="text-slate-600">
        Theatres are shown as rectangles when bounds are configured; locations appear as markers.
      </p>
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
            return (
              <Rectangle
                key={t.id}
                bounds={rectBounds}
                pathOptions={{ color: t.color || '#0d47a1', weight: 2, fillOpacity: 0.1 }}
              >
                <Popup>
                  <strong>{t.label}</strong>
                </Popup>
              </Rectangle>
            );
          })}
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}>
              <Popup>
                <div>
                  <strong>{loc.name}</strong>
                  {loc.type && <div className="text-xs text-slate-600">Type: {loc.type}</div>}
                  {loc.theatre_id && (
                    <div className="text-xs text-slate-600">Theatre: {loc.theatre_id}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

