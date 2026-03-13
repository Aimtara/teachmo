import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-api');

const RATE_LIMIT_CONFIG = {
  maxConcurrentRequests: 3,
  requestDelay: 500,
  backoffMultiplier: 2,
  maxBackoffDelay: 10000,
} as const;

type ErrorType = 'rate_limit' | 'auth' | 'permission' | 'not_found' | 'server' | 'network' | 'general';
type ErrorCode =
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'GENERAL_ERROR';

type ClassifiedError = {
  type: ErrorType;
  code: ErrorCode;
  shouldRetry: boolean;
};

type ErrorLike = {
  message?: string;
  name?: string;
  status?: number;
  response?: {
    status?: number;
  };
};

type QueueRequest<T> = {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type ExecuteOptions<T> = {
  key?: string;
  successMessage?: string | null;
  errorContext?: string;
  onSuccess?: ((result: T) => Promise<void> | void) | null;
  onError?: ((error: unknown, errorInfo: ClassifiedError) => Promise<void> | void) | null;
  skipErrorHandling?: boolean;
  retryable?: boolean;
};

type UseApiOptions = {
  showToastOnError?: boolean;
  showToastOnSuccess?: boolean;
  redirectOnAuth?: boolean;
  enableRetry?: boolean;
  context?: string;
  silent?: boolean;
};

type ApiHookError = {
  original: unknown;
  type: ErrorType;
  code: ErrorCode;
  message: string;
  timestamp: string;
};

type CrudEntity = {
  constructor?: { name?: string };
  list: (...args: unknown[]) => Promise<unknown>;
  filter: (query: unknown, ...args: unknown[]) => Promise<unknown>;
  get: (id: string | number) => Promise<unknown>;
  create: (data: unknown) => Promise<unknown>;
  update: (id: string | number, data: unknown) => Promise<unknown>;
  delete: (id: string | number) => Promise<unknown>;
};

let globalRequestQueue: QueueRequest<unknown>[] = [];
let activeRequests = 0;
let lastRequestTime = 0;

const classifyError = (error: unknown): ClassifiedError => {
  const errorLike = (error ?? {}) as ErrorLike;
  const message = errorLike.message || String(error || 'Unknown error');
  const status = errorLike.response?.status ?? errorLike.status;

  if (status === 429 || message.includes('429') || message.includes('Too Many Requests')) {
    return { type: 'rate_limit', code: 'RATE_LIMITED', shouldRetry: true };
  }
  if (message.includes('Unauthorized') || status === 401) {
    return { type: 'auth', code: 'UNAUTHORIZED', shouldRetry: false };
  }
  if (status === 403 || message.includes('Forbidden')) {
    return { type: 'permission', code: 'FORBIDDEN', shouldRetry: false };
  }
  if (status === 404 || message.includes('Not Found')) {
    return { type: 'not_found', code: 'NOT_FOUND', shouldRetry: false };
  }
  if (
    (typeof status === 'number' && status >= 500) ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return { type: 'server', code: 'SERVER_ERROR', shouldRetry: true };
  }
  if (
    message.includes('Network') ||
    message.includes('Failed to fetch') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNREFUSED')
  ) {
    return { type: 'network', code: 'NETWORK_ERROR', shouldRetry: true };
  }

  return { type: 'general', code: 'GENERAL_ERROR', shouldRetry: false };
};

const processQueue = async () => {
  if (activeRequests >= RATE_LIMIT_CONFIG.maxConcurrentRequests || globalRequestQueue.length === 0) {
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_CONFIG.requestDelay) {
    window.setTimeout(processQueue, RATE_LIMIT_CONFIG.requestDelay - timeSinceLastRequest);
    return;
  }

  const nextRequest = globalRequestQueue.shift();
  if (!nextRequest) return;

  activeRequests += 1;
  lastRequestTime = now;

  try {
    const result = await nextRequest.fn();
    nextRequest.resolve(result);
  } catch (error) {
    nextRequest.reject(error);
  } finally {
    activeRequests -= 1;
    window.setTimeout(processQueue, RATE_LIMIT_CONFIG.requestDelay);
  }
};

const executeWithRateLimit = async <T>(fn: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    globalRequestQueue.push({ fn, resolve, reject } as QueueRequest<unknown>);
    void processQueue();
  });

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries: number, delay: number): Promise<T> => {
  try {
    return await executeWithRateLimit(fn);
  } catch (error) {
    const errorInfo = classifyError(error);

    if (retries > 0 && errorInfo.shouldRetry) {
      const backoffDelay =
        errorInfo.type === 'rate_limit'
          ? Math.min(delay * RATE_LIMIT_CONFIG.backoffMultiplier, RATE_LIMIT_CONFIG.maxBackoffDelay)
          : delay;

      logger.warn(`Request failed, retrying in ${backoffDelay}ms. Retries left: ${retries}`);

      await new Promise((resolve) => window.setTimeout(resolve, backoffDelay));
      return retryWithBackoff(fn, retries - 1, backoffDelay);
    }

    throw error;
  }
};

const getErrorMessage = (error: unknown, context = ''): string => {
  const { type } = classifyError(error);

  switch (type) {
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    case 'auth':
      return 'Your session has expired. Please sign in again.';
    case 'permission':
      return "You don't have permission to perform this action.";
    case 'not_found':
      return `The requested ${context || 'resource'} could not be found.`;
    case 'server':
      return 'Our servers are experiencing issues. Please try again in a few minutes.';
    case 'network':
      return 'Connection problem. Please check your internet and try again.';
    default:
      return `Something went wrong${context ? ` with ${context}` : ''}. Please try again.`;
  }
};

export const useApi = (options: UseApiOptions = {}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, ApiHookError>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllers = useRef<Record<string, AbortController>>({});

  const {
    showToastOnError = true,
    showToastOnSuccess = false,
    redirectOnAuth = true,
    enableRetry = true,
    context = '',
    silent = false,
  } = options;

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: isLoading }));
  }, []);

  const setError = useCallback((key: string, error: ApiHookError) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors[key];
      return nextErrors;
    });
  }, []);

  const cancelRequest = useCallback(
    (key: string) => {
      if (abortControllers.current[key]) {
        abortControllers.current[key].abort();
        delete abortControllers.current[key];
        setLoading(key, false);
      }
    },
    [setLoading],
  );

  const execute = useCallback(
    async <T>(
      operationFn: (signal: AbortSignal) => Promise<T>,
      {
        key = 'default',
        successMessage = null,
        errorContext = context,
        onSuccess = null,
        onError = null,
        skipErrorHandling = false,
        retryable = enableRetry,
      }: ExecuteOptions<T> = {},
    ): Promise<T | null> => {
      cancelRequest(key);

      const controller = new AbortController();
      abortControllers.current[key] = controller;

      try {
        setLoading(key, true);
        clearError(key);

        const result = retryable
          ? await retryWithBackoff(() => operationFn(controller.signal), 3, 1000)
          : await executeWithRateLimit(() => operationFn(controller.signal));

        if (onSuccess) {
          await onSuccess(result);
        }

        if (successMessage && !silent && showToastOnSuccess) {
          toast({ title: 'Success', description: successMessage, variant: 'default' });
        }

        return result;
      } catch (error) {
        const errorLike = error as ErrorLike;
        if (errorLike?.name === 'AbortError') {
          return null;
        }

        const errorInfo = classifyError(error);
        const userMessage = getErrorMessage(error, errorContext);

        setError(key, {
          original: error,
          type: errorInfo.type,
          code: errorInfo.code,
          message: userMessage,
          timestamp: new Date().toISOString(),
        });

        if (errorInfo.type === 'auth' && redirectOnAuth) {
          if (!silent) {
            toast({ variant: 'destructive', title: 'Authentication Required', description: userMessage });
          }
          navigate(createPageUrl('Landing'));
          return null;
        }

        if (!skipErrorHandling && showToastOnError && !silent) {
          toast({
            variant: 'destructive',
            title: errorInfo.type === 'rate_limit' ? 'Please slow down' : 'Error',
            description: userMessage,
            duration: errorInfo.type === 'rate_limit' ? 5000 : 4000,
          });
        }

        if (onError) {
          await onError(error, errorInfo);
        }

        throw error;
      } finally {
        setLoading(key, false);
        delete abortControllers.current[key];
      }
    },
    [cancelRequest, clearError, context, enableRetry, navigate, redirectOnAuth, setError, setLoading, showToastOnError, showToastOnSuccess, silent, toast],
  );

  const entityOperations = {
    list: useCallback(
      (entity: CrudEntity, ...args: unknown[]) =>
        execute(() => entity.list(...args), {
          key: `${entity.constructor?.name || 'entity'}_list`,
          errorContext: 'loading data',
          retryable: true,
        }),
      [execute],
    ),
    filter: useCallback(
      (entity: CrudEntity, query: unknown, ...args: unknown[]) =>
        execute(() => entity.filter(query, ...args), {
          key: `${entity.constructor?.name || 'entity'}_filter`,
          errorContext: 'searching data',
          retryable: true,
        }),
      [execute],
    ),
    get: useCallback(
      (entity: CrudEntity, id: string | number) =>
        execute(() => entity.get(id), {
          key: `${entity.constructor?.name || 'entity'}_get_${id}`,
          errorContext: 'loading item',
          retryable: true,
        }),
      [execute],
    ),
    create: useCallback(
      (entity: CrudEntity, data: unknown, successMessage = 'Item created successfully') =>
        execute(() => entity.create(data), {
          key: `${entity.constructor?.name || 'entity'}_create`,
          successMessage,
          errorContext: 'creating item',
          retryable: false,
        }),
      [execute],
    ),
    update: useCallback(
      (entity: CrudEntity, id: string | number, data: unknown, successMessage = 'Item updated successfully') =>
        execute(() => entity.update(id, data), {
          key: `${entity.constructor?.name || 'entity'}_update_${id}`,
          successMessage,
          errorContext: 'updating item',
          retryable: false,
        }),
      [execute],
    ),
    delete: useCallback(
      (entity: CrudEntity, id: string | number, successMessage = 'Item deleted successfully') =>
        execute(() => entity.delete(id), {
          key: `${entity.constructor?.name || 'entity'}_delete_${id}`,
          successMessage,
          errorContext: 'deleting item',
          retryable: false,
        }),
      [execute],
    ),
  };

  const callFunction = useCallback(
    <T>(fn: (params?: Record<string, unknown>) => Promise<T>, params: Record<string, unknown> = {}, callOptions = {}) =>
      execute(() => fn(params), {
        key: `function_${fn.name || 'call'}`,
        errorContext: 'performing action',
        retryable: true,
        ...(callOptions as ExecuteOptions<T>),
      }),
    [execute],
  );

  const isLoading = useCallback((key = 'default') => Boolean(loadingStates[key]), [loadingStates]);
  const getError = useCallback((key = 'default') => errors[key], [errors]);
  const hasError = useCallback((key = 'default') => Boolean(errors[key]), [errors]);
  const isAnyLoading = useCallback(() => Object.values(loadingStates).some(Boolean), [loadingStates]);
  const hasAnyError = useCallback(() => Object.keys(errors).length > 0, [errors]);
  const clearAllErrors = useCallback(() => setErrors({}), []);

  const cancelAllRequests = useCallback(() => {
    Object.keys(abortControllers.current).forEach(cancelRequest);
  }, [cancelRequest]);

  return {
    execute,
    ...entityOperations,
    callFunction,
    isLoading,
    getError,
    hasError,
    isAnyLoading,
    hasAnyError,
    setLoading,
    setError,
    clearError,
    clearAllErrors,
    cancelRequest,
    cancelAllRequests,
    loadingStates,
    errors,
  };
};

export const useEntityCrud = (entity: CrudEntity, hookOptions: UseApiOptions = {}) => {
  const api = useApi(hookOptions);
  const entityNameRef = useRef(entity.constructor?.name || 'entity');

  const createKey = useCallback((operation: string, id: string | number | null = null) => {
    return id ? `${entityNameRef.current}_${operation}_${id}` : `${entityNameRef.current}_${operation}`;
  }, []);

  return {
    list: useCallback((...args: unknown[]) => api.execute(() => entity.list(...args), { key: createKey('list') }), [api, createKey, entity]),
    filter: useCallback((query: unknown, ...args: unknown[]) => api.execute(() => entity.filter(query, ...args), { key: createKey('filter') }), [api, createKey, entity]),
    get: useCallback((id: string | number) => api.execute(() => entity.get(id), { key: createKey('get', id) }), [api, createKey, entity]),
    create: useCallback((data: unknown, successMessage?: string) => api.execute(() => entity.create(data), { key: createKey('create'), successMessage, retryable: false }), [api, createKey, entity]),
    update: useCallback((id: string | number, data: unknown, successMessage?: string) => api.execute(() => entity.update(id, data), { key: createKey('update', id), successMessage, retryable: false }), [api, createKey, entity]),
    delete: useCallback((id: string | number, successMessage?: string) => api.execute(() => entity.delete(id), { key: createKey('delete', id), successMessage, retryable: false }), [api, createKey, entity]),
    execute: api.execute,
    isLoading: useCallback(
      (operation: string | null = null, id: string | number | null = null) => {
        if (!operation) {
          return Object.keys(api.loadingStates).some(
            (key) => key.startsWith(entityNameRef.current) && api.loadingStates[key],
          );
        }
        return api.isLoading(createKey(operation, id));
      },
      [api, createKey],
    ),
    getError: useCallback(
      (operation: string | null = null, id: string | number | null = null) => {
        if (!operation) return null;
        return api.getError(createKey(operation, id));
      },
      [api, createKey],
    ),
    hasError: useCallback(
      (operation: string | null = null, id: string | number | null = null) => {
        if (!operation) {
          return Object.keys(api.errors).some((key) => key.startsWith(entityNameRef.current) && api.errors[key]);
        }
        return api.hasError(createKey(operation, id));
      },
      [api, createKey],
    ),
    loadingStates: api.loadingStates,
    errors: api.errors,
  };
};

export default useApi;
