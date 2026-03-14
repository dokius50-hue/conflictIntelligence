import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useEvents(options = {}) {
  const { conflictId } = useConflict();
  const { theatres, location_id, limit = 50 } = options;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ conflict_id: conflictId, limit: String(limit) });
    if (theatres?.length) params.set('theatres', theatres.join(','));
    if (location_id) params.set('location_id', location_id);
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEvents(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId, theatres?.join(','), location_id, limit]);
  return { events, loading, error };
}
