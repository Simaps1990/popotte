import { useState, useEffect, useRef, useCallback } from 'react';

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook optimisé pour les requêtes avec cache et gestion d'état
 * Améliore les performances en évitant les requêtes redondantes
 */
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes par défaut
    cacheTime = 10 * 60 * 1000, // 10 minutes par défaut
    refetchOnWindowFocus = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // Vérifier le cache
    const cached = cacheRef.current.get(queryKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < staleTime) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      // Mettre à jour le cache
      cacheRef.current.set(queryKey, {
        data: result,
        timestamp: now
      });

      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [queryKey, queryFn, enabled, staleTime]);

  const refetch = useCallback(async () => {
    // Forcer un refetch en supprimant du cache
    cacheRef.current.delete(queryKey);
    await executeQuery();
  }, [queryKey, executeQuery]);

  useEffect(() => {
    executeQuery();

    // Nettoyage du cache expiré
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > cacheTime) {
          cacheRef.current.delete(key);
        }
      }
    }, cacheTime);

    return () => {
      clearInterval(cleanupInterval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeQuery, cacheTime]);

  // Refetch au focus de la fenêtre si activé
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      executeQuery();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [executeQuery, refetchOnWindowFocus]);

  return { data, loading, error, refetch };
}
