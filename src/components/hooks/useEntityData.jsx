
import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-entity-data');

// Generic hook for entity data operations
export function useEntityData(
  entity,
  options = {}
) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const cacheRef = useRef(new Map());
  
  const {
    initialLoad = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false
  } = options;

  // Set loading state for specific operation
  const setLoadingState = useCallback((key, isLoading) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  // Set error state for specific operation
  const setErrorState = useCallback((key, error) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  // Clear error for specific operation
  const clearError = useCallback((key) => {
    setErrorState(key, null);
  }, [setErrorState]);

  // Get cached data if still valid
  const getCachedData = useCallback((key) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  }, [cacheTime]);

  // Set cached data
  const setCachedData = useCallback((key, data) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  // List all items
  const list = useCallback(async (
    sortBy, 
    limit,
    useCache = true
  ) => {
    const cacheKey = `list_${sortBy || 'default'}_${limit || 'all'}`;
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    setLoadingState('list', true);
    clearError('list');

    try {
      const result = await entity.list(sortBy, limit);
      setData(result);
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to load data',
        code: 'FETCH_ERROR',
        status: 500
      };
      setErrorState('list', apiError);
      throw apiError;
    } finally {
      setLoadingState('list', false);
    }
  }, [entity, getCachedData, setCachedData, setLoadingState, clearError, setErrorState]);

  // Filter items
  const filter = useCallback(async (
    params,
    sortBy,
    limit,
    useCache = false
  ) => {
    const cacheKey = `filter_${JSON.stringify(params)}_${sortBy || 'default'}_${limit || 'all'}`;
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    setLoadingState('filter', true);
    clearError('filter');

    try {
      const result = await entity.filter(params, sortBy, limit);
      if (useCache) {
        setCachedData(cacheKey, result);
      }
      return result;
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to filter data',
        code: 'FILTER_ERROR',
        status: 500
      };
      setErrorState('filter', apiError);
      throw apiError;
    } finally {
      setLoadingState('filter', false);
    }
  }, [entity, getCachedData, setCachedData, setLoadingState, clearError, setErrorState]);

  // Create new item
  const create = useCallback(async (itemData) => {
    setLoadingState('create', true);
    clearError('create');

    try {
      const result = await entity.create(itemData);
      // Add to current data state
      setData(prev => [result, ...prev]);
      // Clear relevant caches
      cacheRef.current.clear();
      return result;
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to create item',
        code: 'CREATE_ERROR',
        status: 500
      };
      setErrorState('create', apiError);
      throw apiError;
    } finally {
      setLoadingState('create', false);
    }
  }, [entity, setLoadingState, clearError, setErrorState]);

  // Update existing item
  const update = useCallback(async (id, updates) => {
    setLoadingState(`update_${id}`, true);
    clearError('update');

    try {
      const result = await entity.update(id, updates);
      // Update in current data state
      setData(prev => prev.map(item => item.id === id ? result : item));
      // Clear relevant caches
      cacheRef.current.clear();
      return result;
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to update item',
        code: 'UPDATE_ERROR',
        status: 500
      };
      setErrorState('update', apiError);
      throw apiError;
    } finally {
      setLoadingState(`update_${id}`, false);
    }
  }, [entity, setLoadingState, clearError, setErrorState]);

  // Check if specific item is being updated
  const isUpdatingItem = useCallback((id) => {
    return Boolean(loading[`update_${id}`]);
  }, [loading]);

  // Refresh data (force reload)
  const refresh = useCallback(async (sortBy, limit) => {
    cacheRef.current.clear();
    return list(sortBy, limit, false);
  }, [list]);

  // Update item with optimistic updates
  const updateItem = useCallback(async (id, updates) => {
    // Optimistically update the UI
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    
    try {
      const result = await update(id, updates);
      return result;
    } catch (error) {
      // Revert optimistic update on error
      await refresh();
      throw error;
    }
  }, [update, refresh]);

  // Delete item
  const remove = useCallback(async (id) => {
    setLoadingState('delete', true);
    clearError('delete');

    try {
      await entity.delete(id);
      // Remove from current data state
      setData(prev => prev.filter(item => item.id !== id));
      // Clear relevant caches
      cacheRef.current.clear();
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to delete item',
        code: 'DELETE_ERROR',
        status: 500
      };
      setErrorState('delete', apiError);
      throw apiError;
    } finally {
      setLoadingState('delete', false);
    }
  }, [entity, setLoadingState, clearError, setErrorState]);

  // Get single item by ID
  const getById = useCallback(async (id) => {
    // First check if item exists in current data
    const existing = data.find(item => item.id === id);
    if (existing) {
      return existing;
    }

    // If entity has get method, use it
    if (entity.get) {
      setLoadingState('get', true);
      clearError('get');

      try {
        const result = await entity.get(id);
        return result;
      } catch (error) {
        const apiError = {
          message: error instanceof Error ? error.message : 'Failed to get item',
          code: 'GET_ERROR',
          status: 500
        };
        setErrorState('get', apiError);
        throw apiError;
      } finally {
        setLoadingState('get', false);
      }
    }

    return null;
  }, [data, entity, setLoadingState, clearError, setErrorState]);

  // Bulk create items
  const bulkCreate = useCallback(async (items) => {
    if (!entity.bulkCreate) {
      throw new Error('Bulk create not supported for this entity');
    }

    setLoadingState('bulkCreate', true);
    clearError('bulkCreate');

    try {
      const results = await entity.bulkCreate(items);
      // Add to current data state
      setData(prev => [...results, ...prev]);
      // Clear relevant caches
      cacheRef.current.clear();
      return results;
    } catch (error) {
      const apiError = {
        message: error instanceof Error ? error.message : 'Failed to bulk create items',
        code: 'BULK_CREATE_ERROR',
        status: 500
      };
      setErrorState('bulkCreate', apiError);
      throw apiError;
    } finally {
      setLoadingState('bulkCreate', false);
    }
  }, [entity, setLoadingState, clearError, setErrorState]);

  // Clear all caches
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Initial load effect
  useEffect(() => {
    if (initialLoad || refetchOnMount) {
      list().catch((error) => logger.error('Initial list load failed', error));
    }
  }, [list, initialLoad, refetchOnMount]);

  return {
    // Data
    data,
    loading,
    errors,
    
    // Operations
    list,
    filter,
    create,
    update,
    updateItem,
    remove,
    getById,
    bulkCreate,
    refresh,
    
    // Utilities
    clearError,
    clearCache,
    isUpdatingItem,
    
    // Computed properties
    isLoading: Object.values(loading).some(Boolean),
    hasErrors: Object.values(errors).some(Boolean),
    isEmpty: data.length === 0 && !loading.list
  };
}
