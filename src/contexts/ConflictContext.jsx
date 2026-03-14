import { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

const ConflictContext = createContext(null);

const DEFAULT_CONFLICT = import.meta.env?.VITE_CONFLICT_ID || 'hormuz_2026';

export function ConflictProvider({ children }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const conflictId = useMemo(() => {
    const fromUrl = searchParams.get('conflict_id');
    return (fromUrl && fromUrl.trim()) ? fromUrl.trim() : DEFAULT_CONFLICT;
  }, [searchParams]);

  const setConflictId = (id) => {
    const params = new URLSearchParams(searchParams);
    if (id && id !== DEFAULT_CONFLICT) {
      params.set('conflict_id', id);
    } else {
      params.delete('conflict_id');
    }
    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  };

  const safeConflictId = conflictId ?? DEFAULT_CONFLICT;
  const value = useMemo(() => ({ conflictId: safeConflictId, setConflictId }), [safeConflictId]);

  return <ConflictContext.Provider value={value}>{children}</ConflictContext.Provider>;
}

export function useConflict() {
  const ctx = useContext(ConflictContext);
  if (!ctx) {
    return {
      conflictId: DEFAULT_CONFLICT,
      setConflictId: () => {},
    };
  }
  return ctx;
}
