import { createContext, ReactNode, useCallback, useContext } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { logAuditEvent } from '@/api/functions';
import { createLogger } from '@/utils/logger';

const apiLogger = createLogger('APIWrapper');

type APIError = {
  message: string;
  code?: string;
  status?: number;
  original?: unknown;
};

type APIResponse<T> = {
  data?: T;
  error?: APIError;
  loading: false;
  retry: () => Promise<APIResponse<T>>;
};

type AuditResource = {
  type: string;
  id: string;
};

type APICallOptions = {
  retries?: number;
  retryDelay?: number;
  silent?: boolean;
  auditAction?: string;
  auditResource?: AuditResource;
};

type APIWrapperContextType = {
  apiCall: <T>(operation: () => Promise<T>, options?: APICallOptions) => Promise<APIResponse<T>>;
};

const APIWrapperContext = createContext<APIWrapperContextType | null>(null);

export const useAPIWrapper = () => {
  const context = useContext(APIWrapperContext);
  if (!context) {
    throw new Error('useAPIWrapper must be used within APIWrapperProvider');
  }
  return context;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type APIWrapperProviderProps = {
  children: ReactNode;
};

export const APIWrapperProvider = ({ children }: APIWrapperProviderProps) => {
  const { toast } = useToast();

  const apiCall = useCallback(
    async <T,>(operation: () => Promise<T>, options: APICallOptions = {}): Promise<APIResponse<T>> => {
      const { retries = 3, retryDelay = 1000, silent = false, auditAction, auditResource } = options;

      let attempt = 0;

      const executeOperation = async (): Promise<APIResponse<T>> => {
        try {
          const startTime = Date.now();
          const result = await operation();
          const duration = Date.now() - startTime;

          if (auditAction && auditResource) {
            try {
              await logAuditEvent({
                action: auditAction,
                resource_type: auditResource.type,
                resource_id: auditResource.id,
                details: { duration, success: true },
                severity: 'low',
              });
            } catch (auditError) {
              apiLogger.warn('Failed to log audit event:', auditError);
            }
          }

          return { data: result, loading: false, retry: executeOperation };
        } catch (error) {
          attempt += 1;
          const errorLike = error as {
            message?: string;
            code?: string;
            status?: number;
            response?: { status?: number };
          };

          const apiError: APIError = {
            message: errorLike.message || 'An unexpected error occurred',
            code: errorLike.code || 'UNKNOWN_ERROR',
            status: errorLike.status || errorLike.response?.status,
            original: error,
          };

          if (auditAction && auditResource) {
            try {
              await logAuditEvent({
                action: `${auditAction}.failed`,
                resource_type: auditResource.type,
                resource_id: auditResource.id,
                details: {
                  error: apiError.message,
                  attempt,
                  willRetry: attempt < retries,
                },
                severity: 'medium',
              });
            } catch (auditError) {
              apiLogger.warn('Failed to log audit event:', auditError);
            }
          }

          const shouldRetry =
            attempt < retries &&
            (apiError.status === 429 ||
              apiError.status === 502 ||
              apiError.status === 503 ||
              apiError.status === 504 ||
              apiError.code === 'NETWORK_ERROR');

          if (shouldRetry) {
            apiLogger.warn(`API call failed (attempt ${attempt}/${retries}), retrying in ${retryDelay}ms...`, apiError);
            apiLogger.warn(
              `API call failed (attempt ${attempt}/${retries}), retrying in ${retryDelay}ms...`,
              {
                message: apiError.message,
                code: apiError.code,
                status: apiError.status,
                attempt,
                retries,
              },
            );
            await delay(retryDelay * attempt);
            return executeOperation();
          }

          if (!silent) {
            const errorMessage = getErrorMessage(apiError);
            toast({
              variant: 'destructive',
              title: 'Something went wrong',
              description: errorMessage,
              action:
                attempt >= retries ? (
                  <button
                    onClick={() => {
                      void executeOperation();
                    }}
                    className="bg-white text-red-600 px-3 py-1 rounded text-sm hover:bg-gray-50"
                  >
                    Try Again
                  </button>
                ) : undefined,
            });
          }

          return { error: apiError, loading: false, retry: executeOperation };
        }
      };

      return executeOperation();
    },
    [toast],
  );

  return <APIWrapperContext.Provider value={{ apiCall }}>{children}</APIWrapperContext.Provider>;
};

const getErrorMessage = (error: APIError) => {
  if (error.status === 401) return 'Please log in again to continue.';
  if (error.status === 403) return "You don't have permission to perform this action.";
  if (error.status === 404) return 'The requested resource was not found.';
  if (error.status === 429) return 'Too many requests. Please try again in a moment.';
  if (error.status === 500) return 'Server error. Our team has been notified.';
  if (error.code === 'NETWORK_ERROR') return 'Network connection issue. Please check your connection.';

  return error.message || 'An unexpected error occurred. Please try again.';
};
