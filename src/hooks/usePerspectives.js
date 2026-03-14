import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function usePerspectives(theatre = null) {
  const { conflictId } = useConflict();
  const [perspectives, setPerspectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ conflict_id: conflictId });
    if (theatre) params.set('theatre', theatre);
    fetch(`/api/perspectives?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPerspectives(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId, theatre]);

  return { perspectives, loading, error };
}
