import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useCausalChain(eventId) {
  const { conflictId } = useConflict();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    setError(null);
    fetch(`/api/causal-chain?event_id=${eventId}&conflict_id=${conflictId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId, conflictId]);

  return { data, loading, error };
}
