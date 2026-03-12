import { useState, useEffect } from 'react';

const conflictId = () => (typeof window !== 'undefined' && window.__CONFLICT_ID__) || import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

export function useEvents(options = {}) {
  const { theatres, limit = 50 } = options;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams({ conflict_id: conflictId(), limit: String(limit) });
    if (theatres?.length) params.set('theatres', theatres.join(','));
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEvents(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [theatres?.join(','), limit]);
  return { events, loading, error };
}
