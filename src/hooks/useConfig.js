import { useState, useEffect } from 'react';

const conflictId = () => (typeof window !== 'undefined' && window.__CONFLICT_ID__) || import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

export function useConfig() {
  const [data, setData] = useState({ actors: [], theatres: [], options: [], thresholds: [], scenarios: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch(`/api/config?conflict_id=${encodeURIComponent(conflictId())}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ actors: d.actors || [], theatres: d.theatres || [], options: d.options || [], thresholds: d.thresholds || [], scenarios: d.scenarios || [] });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { ...data, loading, error };
}
