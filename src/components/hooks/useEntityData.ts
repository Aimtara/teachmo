import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-entity-data');

type ApiErrorCode =
  | 'FETCH_ERROR'
  | 'FILTER_ERROR'
  | 'CREATE_ERROR'
  | 'UPDATE_ERROR'
  | 'DELETE_ERROR'
  | 'GET_ERROR'
  | 'BULK_CREATE_ERROR';

type ApiError = {
  message: string;
  code: ApiErrorCode;
  status: number;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type EntityAdapter<T extends { id: string | number }, CreateInput, UpdateInput, FilterInput> = {
  list: (sortBy?: string, limit?: number) => Promise<T[]>;
  filter: (params?: FilterInput, sortBy?: string, limit?: number) => Promise<T[]>;
  create: (itemData: CreateInput) => Promise<T>;
  update: (id: string | number, updates: UpdateInput) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
  get?: (id: string | number) => Promise<T | null>;
  bulkCreate?: (items: CreateInput[]) => Promise<T[]>;
};

type UseEntityOptions = {
  initialLoad?: boolean;
  cacheTime?: number;
  refetchOnMount?: boolean;
};

const toApiError = (error: unknown, fallback: string, code: ApiErrorCode): ApiError => ({
  message: error instanceof Error ? error.message : fallback,
  code,
  status: 500,
});

export function useEntityData<
  T extends { id: string | number },
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>,
  FilterInput = Record<string, unknown>,
>(entity: EntityAdapter<T, CreateInput, UpdateInput, FilterInput>, options: UseEntityOptions = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, ApiError | null>>({});
  const cacheRef = useRef<Map<string, CacheEntry<T[]>>>(new Map());

  const { initialLoad = true, cacheTime = 5 * 60 * 1000, refetchOnMount = false } = options;

  const setLoadingState = useCallback((key: string, isLoading: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: isLoading }));
  }, []);

  const setErrorState = useCallback((key: string, error: ApiError | null) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
  }, []);

  const clearError = useCallback(
    (key: string) => {
      setErrorState(key, null);
    },
    [setErrorState],
  );

  const getCachedData = useCallback(
    (key: string) => {
      const cached = cacheRef.current.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
      }
      return null;
    },
    [cacheTime],
  );

  const setCachedData = useCallback((key: string, nextData: T[]) => {
    cacheRef.current.set(key, { data: nextData, timestamp: Date.now() });
  }, []);

  const list = useCallback(
    async (sortBy?: string, limit?: number, useCache = true) => {
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
        const apiError = toApiError(error, 'Failed to load data', 'FETCH_ERROR');
        setErrorState('list', apiError);
        throw apiError;
      } finally {
        setLoadingState('list', false);
      }
    },
    [clearError, entity, getCachedData, setCachedData, setErrorState, setLoadingState],
  );

  const filter = useCallback(
    async (params?: FilterInput, sortBy?: string, limit?: number, useCache = false) => {
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
        const apiError = toApiError(error, 'Failed to filter data', 'FILTER_ERROR');
        setErrorState('filter', apiError);
        throw apiError;
      } finally {
        setLoadingState('filter', false);
      }
    },
    [clearError, entity, getCachedData, setCachedData, setErrorState, setLoadingState],
  );

  const create = useCallback(
    async (itemData: CreateInput) => {
      setLoadingState('create', true);
      clearError('create');

      try {
        const result = await entity.create(itemData);
        setData((prev) => [result, ...prev]);
        cacheRef.current.clear();
        return result;
      } catch (error) {
        const apiError = toApiError(error, 'Failed to create item', 'CREATE_ERROR');
        setErrorState('create', apiError);
        throw apiError;
      } finally {
        setLoadingState('create', false);
      }
    },
    [clearError, entity, setErrorState, setLoadingState],
  );

  const update = useCallback(
    async (id: string | number, updates: UpdateInput) => {
      setLoadingState(`update_${id}`, true);
      clearError('update');

      try {
        const result = await entity.update(id, updates);
        setData((prev) => prev.map((item) => (item.id === id ? result : item)));
        cacheRef.current.clear();
        return result;
      } catch (error) {
        const apiError = toApiError(error, 'Failed to update item', 'UPDATE_ERROR');
        setErrorState('update', apiError);
        throw apiError;
      } finally {
        setLoadingState(`update_${id}`, false);
      }
    },
    [clearError, entity, setErrorState, setLoadingState],
  );

  const isUpdatingItem = useCallback((id: string | number) => Boolean(loading[`update_${id}`]), [loading]);

  const refresh = useCallback(
    async (sortBy?: string, limit?: number) => {
      cacheRef.current.clear();
      return list(sortBy, limit, false);
    },
    [list],
  );

  const updateItem = useCallback(
    async (id: string | number, updates: UpdateInput) => {
      setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...(updates as object) } : item)));

      try {
        return await update(id, updates);
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [refresh, update],
  );

  const remove = useCallback(
    async (id: string | number) => {
      setLoadingState('delete', true);
      clearError('delete');

      try {
        await entity.delete(id);
        setData((prev) => prev.filter((item) => item.id !== id));
        cacheRef.current.clear();
      } catch (error) {
        const apiError = toApiError(error, 'Failed to delete item', 'DELETE_ERROR');
        setErrorState('delete', apiError);
        throw apiError;
      } finally {
        setLoadingState('delete', false);
      }
    },
    [clearError, entity, setErrorState, setLoadingState],
  );

  const getById = useCallback(
    async (id: string | number) => {
      const existing = data.find((item) => item.id === id);
      if (existing) {
        return existing;
      }

      if (entity.get) {
        setLoadingState('get', true);
        clearError('get');

        try {
          return await entity.get(id);
        } catch (error) {
          const apiError = toApiError(error, 'Failed to get item', 'GET_ERROR');
          setErrorState('get', apiError);
          throw apiError;
        } finally {
          setLoadingState('get', false);
        }
      }

      return null;
    },
    [clearError, data, entity, setErrorState, setLoadingState],
  );

  const bulkCreate = useCallback(
    async (items: CreateInput[]) => {
      if (!entity.bulkCreate) {
        throw new Error('Bulk create not supported for this entity');
      }

      setLoadingState('bulkCreate', true);
      clearError('bulkCreate');

      try {
        const results = await entity.bulkCreate(items);
        setData((prev) => [...results, ...prev]);
        cacheRef.current.clear();
        return results;
      } catch (error) {
        const apiError = toApiError(error, 'Failed to bulk create items', 'BULK_CREATE_ERROR');
        setErrorState('bulkCreate', apiError);
        throw apiError;
      } finally {
        setLoadingState('bulkCreate', false);
      }
    },
    [clearError, entity, setErrorState, setLoadingState],
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    if (initialLoad || refetchOnMount) {
      void list().catch((error) => logger.error('Initial list load failed', error));
    }
  }, [initialLoad, list, refetchOnMount]);

  return {
    data,
    loading,
    errors,
    list,
    filter,
    create,
    update,
    updateItem,
    remove,
    getById,
    bulkCreate,
    refresh,
    clearError,
    clearCache,
    isUpdatingItem,
    isLoading: Object.values(loading).some(Boolean),
    hasErrors: Object.values(errors).some(Boolean),
    isEmpty: data.length === 0 && !loading.list,
  };
}
