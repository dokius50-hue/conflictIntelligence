import { useState, useEffect } from 'react';

const conflictId = () =>
  (typeof window !== 'undefined' && window.__CONFLICT_ID__) ||
  import.meta.env?.VITE_CONFLICT_ID ||
  'hormuz_2026';

export function useMarket() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/market?conflict_id=${conflictId()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setIndicators(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { indicators, loading, error };
}
