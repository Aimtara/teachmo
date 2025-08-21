import React, { createContext, useContext, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { logAuditEvent } from '@/api/functions';

/**
 * @typedef {Object} APIError
 * @property {string} message
 * @property {string} [code]
 * @property {number} [status]
 * @property {Error} [original]
 */

/**
 * @typedef {Object} APIResponse
 * @property {any} [data]
 * @property {APIError} [error]
 * @property {boolean} loading
 * @property {Function} retry
 */

const APIWrapperContext = createContext(null);

export const useAPIWrapper = () => {
  const context = useContext(APIWrapperContext);
  if (!context) {
    throw new Error('useAPIWrapper must be used within APIWrapperProvider');
  }
  return context;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const APIWrapperProvider = ({ children }) => {
  const { toast } = useToast();

  const apiCall = useCallback(async (operation, options = {}) => {
    const {
      retries = 3,
      retryDelay = 1000,
      silent = false,
      auditAction,
      auditResource
    } = options;

    let attempt = 0;
    let lastError = null;

    const executeOperation = async () => {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Log successful API calls for audit if specified
        if (auditAction && auditResource) {
          try {
            await logAuditEvent({
              action: auditAction,
              resource_type: auditResource.type,
              resource_id: auditResource.id,
              details: { duration, success: true },
              severity: 'low'
            });
          } catch (auditError) {
            console.warn('Failed to log audit event:', auditError);
          }
        }

        return { data: result, loading: false, retry: executeOperation };
      } catch (error) {
        attempt++;
        
        const apiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'UNKNOWN_ERROR',
          status: error.status || error.response?.status,
          original: error
        };

        // Log failed API calls for audit
        if (auditAction && auditResource) {
          try {
            await logAuditEvent({
              action: `${auditAction}.failed`,
              resource_type: auditResource.type,
              resource_id: auditResource.id,
              details: { 
                error: apiError.message, 
                attempt, 
                willRetry: attempt < retries 
              },
              severity: 'medium'
            });
          } catch (auditError) {
            console.warn('Failed to log audit event:', auditError);
          }
        }

        // Determine if we should retry
        const shouldRetry = attempt < retries && (
          apiError.status === 429 || // Rate limited
          apiError.status === 502 || // Bad gateway
          apiError.status === 503 || // Service unavailable
          apiError.status === 504 || // Gateway timeout
          apiError.code === 'NETWORK_ERROR'
        );

        if (shouldRetry) {
          console.warn(`API call failed (attempt ${attempt}/${retries}), retrying in ${retryDelay}ms...`, apiError);
          await delay(retryDelay * attempt); // Exponential backoff
          return executeOperation();
        }

        lastError = apiError;

        // Show user-friendly toast notifications
        if (!silent) {
          const errorMessage = getErrorMessage(apiError);
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: errorMessage,
            action: attempt >= retries ? (
              <button
                onClick={() => executeOperation()}
                className="bg-white text-red-600 px-3 py-1 rounded text-sm hover:bg-gray-50"
              >
                Try Again
              </button>
            ) : undefined
          });
        }

        return { error: apiError, loading: false, retry: executeOperation };
      }
    };

    return executeOperation();
  }, [toast]);

  return (
    <APIWrapperContext.Provider value={{ apiCall }}>
      {children}
    </APIWrapperContext.Provider>
  );
};

const getErrorMessage = (error) => {
  if (error.status === 401) return "Please log in again to continue.";
  if (error.status === 403) return "You don't have permission to perform this action.";
  if (error.status === 404) return "The requested resource was not found.";
  if (error.status === 429) return "Too many requests. Please try again in a moment.";
  if (error.status === 500) return "Server error. Our team has been notified.";
  if (error.code === 'NETWORK_ERROR') return "Network connection issue. Please check your connection.";
  
  return error.message || "An unexpected error occurred. Please try again.";
};
