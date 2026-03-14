import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

export function useScenarios() {
  const { conflictId } = useConflict();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/scenarios?conflict_id=${conflictId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setScenarios(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  return { scenarios, loading, error };
}
