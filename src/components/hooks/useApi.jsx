
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-api');

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxConcurrentRequests: 3,
  requestDelay: 500, // ms between requests
  backoffMultiplier: 2,
  maxBackoffDelay: 10000, // 10 seconds max
};

// Global request queue and tracking
let globalRequestQueue = [];
let activeRequests = 0;
let lastRequestTime = 0;

// Enhanced error classification
const classifyError = (error) => {
  const message = error?.message || error?.toString() || 'Unknown error';
  const status = error?.response?.status || error?.status;
  
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
  
  if (status >= 500 || message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return { type: 'server', code: 'SERVER_ERROR', shouldRetry: true };
  }
  
  if (message.includes('Network') || message.includes('Failed to fetch') || 
      message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED')) {
    return { type: 'network', code: 'NETWORK_ERROR', shouldRetry: true };
  }
  
  return { type: 'general', code: 'GENERAL_ERROR', shouldRetry: false };
};

// Rate-limited request executor
const executeWithRateLimit = async (fn) => {
  return new Promise((resolve, reject) => {
    const request = { fn, resolve, reject };
    globalRequestQueue.push(request);
    processQueue();
  });
};

const processQueue = async () => {
  if (activeRequests >= RATE_LIMIT_CONFIG.maxConcurrentRequests || globalRequestQueue.length === 0) {
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_CONFIG.requestDelay) {
    setTimeout(processQueue, RATE_LIMIT_CONFIG.requestDelay - timeSinceLastRequest);
    return;
  }

  const { fn, resolve, reject } = globalRequestQueue.shift();
  activeRequests++;
  lastRequestTime = now;

  try {
    const result = await fn();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    // Process next request after a delay
    setTimeout(processQueue, RATE_LIMIT_CONFIG.requestDelay);
  }
};

// Smart retry with exponential backoff
const retryWithBackoff = async (fn, retries, delay, errorType) => {
  try {
    return await executeWithRateLimit(fn);
  } catch (error) {
    const errorInfo = classifyError(error);
    
    if (retries > 0 && errorInfo.shouldRetry) {
      const backoffDelay = errorInfo.type === 'rate_limit' 
        ? Math.min(delay * RATE_LIMIT_CONFIG.backoffMultiplier, RATE_LIMIT_CONFIG.maxBackoffDelay)
        : delay;
        
      logger.warn(`Request failed, retrying in ${backoffDelay}ms. Retries left: ${retries}`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return retryWithBackoff(fn, retries - 1, backoffDelay, errorType);
    }
    
    throw error;
  }
};

// User-friendly error messages
const getErrorMessage = (error, context = '') => {
  const { type } = classifyError(error);
  
  switch (type) {
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    case 'auth':
      return 'Your session has expired. Please sign in again.';
    case 'permission':
      return 'You don\'t have permission to perform this action.';
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

export const useApi = (options = {}) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllers = useRef({});
  
  const {
    showToastOnError = true,
    showToastOnSuccess = false,
    redirectOnAuth = true,
    enableRetry = true,
    context = '',
    silent = false
  } = options;

  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const setError = useCallback((key, error) => {
    setErrors(prev => ({
      ...prev,
      [key]: error
    }));
  }, []);

  const clearError = useCallback((key) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  const cancelRequest = useCallback((key) => {
    if (abortControllers.current[key]) {
      abortControllers.current[key].abort();
      delete abortControllers.current[key];
      setLoading(key, false);
    }
  }, [setLoading]);

  const execute = useCallback(async (
    operationFn, 
    {
      key = 'default',
      successMessage = null,
      errorContext = context,
      onSuccess = null,
      onError = null,
      skipErrorHandling = false,
      retryable = enableRetry
    } = {}
  ) => {
    cancelRequest(key);
    
    const controller = new AbortController();
    abortControllers.current[key] = controller;
    
    try {
      setLoading(key, true);
      clearError(key);
      
      let result;
      
      if (retryable) {
        result = await retryWithBackoff(
          () => operationFn(controller.signal),
          3, // max retries
          1000, // initial delay
          'api_call'
        );
      } else {
        result = await executeWithRateLimit(() => operationFn(controller.signal));
      }
      
      if (onSuccess) {
        await onSuccess(result);
      }
      
      if (successMessage && !silent && showToastOnSuccess) {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default"
        });
      }
      
      return result;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      
      const errorInfo = classifyError(error);
      const userMessage = getErrorMessage(error, errorContext);
      
      setError(key, {
        original: error,
        type: errorInfo.type,
        code: errorInfo.code,
        message: userMessage,
        timestamp: new Date().toISOString()
      });
      
      // Handle authentication errors
      if (errorInfo.type === 'auth' && redirectOnAuth) {
        if (!silent) {
          toast({
            variant: "destructive",
            title: "Authentication Required",
            description: userMessage,
          });
        }
        navigate(createPageUrl("Landing"));
        return null;
      }
      
      // Show error toast with enhanced rate limit handling
      if (!skipErrorHandling && showToastOnError && !silent) {
        toast({
          variant: "destructive",
          title: errorInfo.type === 'rate_limit' ? "Please slow down" : "Error",
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
  }, [
    cancelRequest, setLoading, clearError, setError, toast, navigate, 
    context, enableRetry, showToastOnError, showToastOnSuccess, 
    redirectOnAuth, silent
  ]);

  // Enhanced entity operations with better rate limiting
  const entityOperations = {
    list: useCallback((entity, ...args) => 
      execute(
        () => entity.list(...args),
        { 
          key: `${entity.constructor.name || 'entity'}_list`,
          errorContext: 'loading data',
          retryable: true
        }
      ), [execute]),

    filter: useCallback((entity, query, ...args) => 
      execute(
        () => entity.filter(query, ...args),
        { 
          key: `${entity.constructor.name || 'entity'}_filter`,
          errorContext: 'searching data',
          retryable: true
        }
      ), [execute]),

    get: useCallback((entity, id) => 
      execute(
        () => entity.get(id),
        { 
          key: `${entity.constructor.name || 'entity'}_get_${id}`,
          errorContext: 'loading item',
          retryable: true
        }
      ), [execute]),

    create: useCallback((entity, data, successMessage = 'Item created successfully') => 
      execute(
        () => entity.create(data),
        { 
          key: `${entity.constructor.name || 'entity'}_create`,
          successMessage,
          errorContext: 'creating item',
          retryable: false // Don't retry creates to avoid duplicates
        }
      ), [execute]),

    update: useCallback((entity, id, data, successMessage = 'Item updated successfully') => 
      execute(
        () => entity.update(id, data),
        { 
          key: `${entity.constructor.name || 'entity'}_update_${id}`,
          successMessage,
          errorContext: 'updating item',
          retryable: false // Don't retry updates to avoid race conditions
        }
      ), [execute]),

    delete: useCallback((entity, id, successMessage = 'Item deleted successfully') => 
      execute(
        () => entity.delete(id),
        { 
          key: `${entity.constructor.name || 'entity'}_delete_${id}`,
          successMessage,
          errorContext: 'deleting item',
          retryable: false // Don't retry deletes
        }
      ), [execute])
  };

  const callFunction = useCallback((fn, params = {}, options = {}) => 
    execute(
      () => fn(params),
      {
        key: `function_${fn.name || 'call'}`,
        errorContext: 'performing action',
        retryable: true,
        ...options
      }
    ), [execute]);

  // Utility functions
  const isLoading = useCallback((key = 'default') => 
    Boolean(loadingStates[key]), [loadingStates]);

  const getError = useCallback((key = 'default') => 
    errors[key], [errors]);

  const hasError = useCallback((key = 'default') => 
    Boolean(errors[key]), [errors]);

  const isAnyLoading = useCallback(() => 
    Object.values(loadingStates).some(Boolean), [loadingStates]);

  const hasAnyError = useCallback(() => 
    Object.keys(errors).length > 0, [errors]);

  const clearAllErrors = useCallback(() => 
    setErrors({}), []);

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
    errors
  };
};

/**
 * A specialized hook for performing CRUD operations on a specific entity.
 * It simplifies the use of the generic `useApi` hook by pre-binding the entity.
 * @param {object} entity - The entity class or an instance of the entity class (e.g., User, new UserApi()).
 * @param {object} hookOptions - Configuration options for the underlying `useApi` hook.
 * @returns An object with CRUD methods and state helpers for that entity.
 */
export const useEntityCrud = (entity, hookOptions = {}) => {
  const api = useApi(hookOptions);
  // Use entity.constructor.name for consistency with useApi's entityOperations keys
  const entityNameRef = useRef(entity.constructor?.name || 'entity');

  const createKey = useCallback((operation, id = null) => {
    return id ? `${entityNameRef.current}_${operation}_${id}` : `${entityNameRef.current}_${operation}`;
  }, []);

  return {
    list: useCallback((...args) => 
      api.execute(() => entity.list(...args), { key: createKey('list') }), 
    [api, entity, createKey]),

    filter: useCallback((query, ...args) => 
      api.execute(() => entity.filter(query, ...args), { key: createKey('filter') }), 
    [api, entity, createKey]),

    get: useCallback((id) => 
      api.execute(() => entity.get(id), { key: createKey('get', id) }), 
    [api, entity, createKey]),

    create: useCallback((data, successMessage) => 
      api.execute(() => entity.create(data), { 
        key: createKey('create'), 
        successMessage, 
        retryable: false // Ensure consistency with useApi's create operation
      }), 
    [api, entity, createKey]),

    update: useCallback((id, data, successMessage) => 
      api.execute(() => entity.update(id, data), { 
        key: createKey('update', id), 
        successMessage, 
        retryable: false // Ensure consistency with useApi's update operation
      }), 
    [api, entity, createKey]),

    delete: useCallback((id, successMessage) => 
      api.execute(() => entity.delete(id), { 
        key: createKey('delete', id), 
        successMessage, 
        retryable: false // Ensure consistency with useApi's delete operation
      }), 
    [api, entity, createKey]),
    
    // Generic execute for non-standard entity methods
    execute: api.execute,

    isLoading: useCallback((operation = null, id = null) => {
      if (!operation) {
        // Check if any operation for this entity is loading
        return Object.keys(api.loadingStates).some(
          key => key.startsWith(entityNameRef.current) && api.loadingStates[key]
        );
      }
      return api.isLoading(createKey(operation, id));
    }, [api.isLoading, api.loadingStates, createKey]),

    getError: useCallback((operation = null, id = null) => {
      if (!operation) {
        // As per outline, return null if no specific operation key is provided
        return null; 
      }
      return api.getError(createKey(operation, id));
    }, [api.getError, createKey]),

    hasError: useCallback((operation = null, id = null) => {
      if (!operation) {
        return Object.keys(api.errors).some(
          key => key.startsWith(entityNameRef.current) && api.errors[key]
        );
      }
      return api.hasError(createKey(operation, id));
    }, [api.hasError, api.errors, createKey]),

    loadingStates: api.loadingStates,
    errors: api.errors,
  };
};

export default useApi;
