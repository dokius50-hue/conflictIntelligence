import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useOptions() {
  const { conflictId } = useConflict();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/options?conflict_id=${conflictId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  return { data, loading, error };
}
