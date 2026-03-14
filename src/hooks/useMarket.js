import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useMarket() {
  const { conflictId } = useConflict();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/market?conflict_id=${conflictId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setIndicators(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  return { indicators, loading, error };
}
