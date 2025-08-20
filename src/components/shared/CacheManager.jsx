import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGlobalState, useGlobalActions } from './GlobalStateManager';

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries

// Cache strategies
export const CacheStrategies = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first', 
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

export const useCacheManager = () => {
  const state = useGlobalState();
  const actions = useGlobalActions();
  const pendingRequests = useRef(new Map());

  // Get cached data with strategy
  const getCached = useCallback((key, strategy = CacheStrategies.CACHE_FIRST) => {
    const cached = state.cache[key];
    
    if (!cached) return null;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > cached.ttl;
    
    switch (strategy) {
      case CacheStrategies.CACHE_FIRST:
        return isExpired ? null : cached.data;
      
      case CacheStrategies.STALE_WHILE_REVALIDATE:
        return cached.data; // Return even if stale
      
      case CacheStrategies.CACHE_ONLY:
        return cached.data;
      
      case CacheStrategies.NETWORK_FIRST:
      case CacheStrategies.NETWORK_ONLY:
        return null; // Always fetch from network
      
      default:
        return isExpired ? null : cached.data;
    }
  }, [state.cache]);

  // Set cached data with size management
  const setCached = useCallback((key, data, ttl = DEFAULT_TTL) => {
    // Implement LRU eviction if cache is full
    const cacheKeys = Object.keys(state.cache);
    if (cacheKeys.length >= MAX_CACHE_SIZE) {
      // Find and remove oldest entry
      const oldestKey = cacheKeys.reduce((oldest, current) => {
        const oldestTime = state.cache[oldest]?.timestamp || Infinity;
        const currentTime = state.cache[current]?.timestamp || Infinity;
        return currentTime < oldestTime ? current : oldest;
      });
      
      actions.cacheInvalidate(oldestKey);
    }
    
    actions.cacheSet(key, data, ttl);
  }, [state.cache, actions]);

  // Cached fetch with deduplication
  const cachedFetch = useCallback(async (
    key,
    fetchFn,
    {
      strategy = CacheStrategies.CACHE_FIRST,
      ttl = DEFAULT_TTL,
      revalidateInBackground = false,
    } = {}
  ) => {
    // Check for pending request to avoid duplicate calls
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key);
    }

    const cached = getCached(key, strategy);
    
    // Return cached data based on strategy
    if (strategy === CacheStrategies.CACHE_FIRST && cached) {
      return cached;
    }
    
    if (strategy === CacheStrategies.CACHE_ONLY) {
      return cached || null;
    }

    // Create fetch promise
    const fetchPromise = fetchFn()
      .then(data => {
        setCached(key, data, ttl);
        pendingRequests.current.delete(key);
        return data;
      })
      .catch(error => {
        pendingRequests.current.delete(key);
        
        // Return cached data on network error if available
        if (strategy === CacheStrategies.STALE_WHILE_REVALIDATE && cached) {
          return cached;
        }
        
        throw error;
      });

    pendingRequests.current.set(key, fetchPromise);

    // Handle stale-while-revalidate strategy
    if (strategy === CacheStrategies.STALE_WHILE_REVALIDATE && cached) {
      // Return cached data immediately, fetch in background
      if (revalidateInBackground) {
        fetchPromise.catch(() => {}); // Ignore background errors
      }
      return cached;
    }

    return fetchPromise;
  }, [getCached, setCached]);

  // Batch cache operations
  const batchInvalidate = useCallback((keys) => {
    keys.forEach(key => actions.cacheInvalidate(key));
  }, [actions]);

  // Cache statistics
  const getCacheStats = useCallback(() => {
    const entries = Object.keys(state.cache);
    const totalSize = entries.reduce((size, key) => {
      return size + JSON.stringify(state.cache[key].data).length;
    }, 0);

    const expired = entries.filter(key => {
      const cached = state.cache[key];
      return Date.now() - cached.timestamp > cached.ttl;
    }).length;

    return {
      totalEntries: entries.length,
      expiredEntries: expired,
      totalSizeBytes: totalSize,
      hitRate: null, // Would need to track hits/misses
    };
  }, [state.cache]);

  // Preload cache entries
  const preload = useCallback(async (entries) => {
    const promises = entries.map(({ key, fetchFn, ttl }) => 
      cachedFetch(key, fetchFn, { ttl, strategy: CacheStrategies.NETWORK_FIRST })
        .catch(error => console.warn(`Preload failed for ${key}:`, error))
    );

    return Promise.allSettled(promises);
  }, [cachedFetch]);

  return {
    getCached,
    setCached,
    cachedFetch,
    invalidate: actions.cacheInvalidate,
    batchInvalidate,
    getCacheStats,
    preload,
  };
};

// Entity-specific cache hooks
export const useEntityCache = (entityName) => {
  const cacheManager = useCacheManager();
  
  const getEntityKey = useCallback((operation, id = null) => {
    return id ? `${entityName}_${operation}_${id}` : `${entityName}_${operation}`;
  }, [entityName]);

  return {
    list: (fetchFn, options = {}) => 
      cacheManager.cachedFetch(getEntityKey('list'), fetchFn, options),
    
    get: (id, fetchFn, options = {}) => 
      cacheManager.cachedFetch(getEntityKey('get', id), fetchFn, options),
    
    invalidateList: () => cacheManager.invalidate(getEntityKey('list')),
    invalidateItem: (id) => cacheManager.invalidate(getEntityKey('get', id)),
    invalidateAll: () => {
      cacheManager.batchInvalidate([
        getEntityKey('list'),
        ...Array.from({ length: 100 }, (_, i) => getEntityKey('get', i))
      ]);
    },
  };
};

// React Query-like hook for cached data fetching
export const useCachedQuery = (key, fetchFn, options = {}) => {
  const cacheManager = useCacheManager();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    strategy = CacheStrategies.CACHE_FIRST,
    ttl = DEFAULT_TTL,
    enabled = true,
    refetchInterval = null,
  } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cacheManager.cachedFetch(key, fetchFn, {
        strategy,
        ttl,
      });
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, strategy, ttl, enabled, cacheManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, fetchData]);

  const refetch = useCallback(() => {
    cacheManager.invalidate(key);
    return fetchData();
  }, [key, fetchData, cacheManager]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};