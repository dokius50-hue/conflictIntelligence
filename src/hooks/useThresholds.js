import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useThresholds() {
  const { conflictId } = useConflict();
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/thresholds?conflict_id=${conflictId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setThresholds(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  return { thresholds, loading, error };
}
