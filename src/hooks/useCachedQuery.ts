/*
 * Custom React hook that wraps a data-fetching function with a simple
 * stale-while-revalidate cache. This hook stores the result of the
 * fetch in memory and optionally in localStorage so that repeated
 * requests return immediately with cached data while a background
 * refresh updates the cache. It reduces perceived latency for
 * frequently-accessed data such as directory lists or content
 * libraries, improving user experience on slow networks.
 *
 * Usage:
 * ```ts
 * const { data, loading, error } = useCachedQuery('library', fetchLibrary);
 * ```
 */

import { useEffect, useRef, useState } from 'react';

type Fetcher<T> = () => Promise<T>;

interface CachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
}

const globalCache: Record<string, any> = {};

export function useCachedQuery<T>(
  key: string,
  fetcher: Fetcher<T>,
  options?: { persist?: boolean }
): CachedQueryResult<T> {
  const [data, setData] = useState<T | null>(() => {
    if (globalCache[key] !== undefined) {
      return globalCache[key];
    }
    if (options?.persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`cache:${key}`);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch {
          // ignore JSON errors
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!cancelled) {
          globalCache[key] = result;
          if (options?.persist && typeof window !== 'undefined') {
            try {
              localStorage.setItem(`cache:${key}`, JSON.stringify(result));
            } catch {
              // storage full or unavailable
            }
          }
          if (isMounted.current) {
            setData(result);
          }
        }
      } catch (err) {
        if (!cancelled && isMounted.current) {
          setError(err);
        }
      } finally {
        if (!cancelled && isMounted.current) {
          setLoading(false);
        }
      }
    }
    // Always refresh in background, even if we have cached data
    refresh();
    return () => {
      cancelled = true;
    };
  }, [key, fetcher, options?.persist]);

  return { data, loading, error };
}
