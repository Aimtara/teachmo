import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/api/entities';
import { createLogger } from '@/utils/logger';
import { createPageUrl } from '@/utils';

const apiProviderLogger = createLogger('ApiProvider');

type CacheEntry = {
  data: unknown;
  expires: number;
};

type RateLimitTrackerEntry = {
  count: number;
  resetTime: number;
};

type CacheManager = {
  get: (key: string) => CacheEntry | undefined;
  set: (key: string, value: unknown, ttl?: number) => void;
  clear: (pattern?: string) => void;
  isValid: (key: string) => boolean;
};

type RateLimiter = {
  canProceed: (endpoint: string) => boolean;
};

type NetworkStatus = {
  isOnline: boolean;
  lastCheck: number;
};

type ApiProviderContextValue = {
  handleCriticalError: (error: Error, context: string) => void;
  cacheManager: CacheManager;
  rateLimiter: RateLimiter;
  networkStatus: NetworkStatus;
  toast: ReturnType<typeof useToast>['toast'];
};

type ApiProviderProps = {
  children: ReactNode;
};

const ApiContext = createContext<ApiProviderContextValue | null>(null);

export function ApiProvider({ children }: ApiProviderProps) {
  const { toast } = useToast();
  const globalCache = useRef<Map<string, CacheEntry>>(new Map());
  const rateLimitTracker = useRef<Map<string, RateLimitTrackerEntry>>(new Map());

  const handleCriticalError = useCallback((error: Error, context: string) => {
    apiProviderLogger.error(`Critical API Error [${context}]:`, error);

    if (window.location.hostname !== 'localhost') {
      // Integration point for error reporting service
    }

    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      User.logout().catch(() => {});
      window.location.href = createPageUrl('Landing');
    }
  }, []);

  const cacheManager: CacheManager = {
    get: (key) => globalCache.current.get(key),
    set: (key, value, ttl = 300000) => {
      globalCache.current.set(key, {
        data: value,
        expires: Date.now() + ttl,
      });
    },
    clear: (pattern) => {
      if (pattern) {
        for (const key of globalCache.current.keys()) {
          if (key.includes(pattern)) {
            globalCache.current.delete(key);
          }
        }
      } else {
        globalCache.current.clear();
      }
    },
    isValid: (key) => {
      const cached = globalCache.current.get(key);
      return Boolean(cached && cached.expires > Date.now());
    },
  };

  const rateLimiter: RateLimiter = {
    canProceed: (endpoint) => {
      const now = Date.now();
      const tracker = rateLimitTracker.current.get(endpoint) || { count: 0, resetTime: now + 60000 };

      if (now > tracker.resetTime) {
        tracker.count = 0;
        tracker.resetTime = now + 60000;
      }

      if (tracker.count >= 60) {
        return false;
      }

      tracker.count++;
      rateLimitTracker.current.set(endpoint, tracker);
      return true;
    },
  };

  const networkStatus = useRef<NetworkStatus>({
    isOnline: navigator.onLine,
    lastCheck: Date.now(),
  });

  useEffect(() => {
    const handleOnline = () => {
      networkStatus.current.isOnline = true;
      networkStatus.current.lastCheck = Date.now();
    };

    const handleOffline = () => {
      networkStatus.current.isOnline = false;
      networkStatus.current.lastCheck = Date.now();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue: ApiProviderContextValue = {
    handleCriticalError,
    cacheManager,
    rateLimiter,
    networkStatus: networkStatus.current,
    toast,
  };

  return <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>;
}

export const useApiContext = (): ApiProviderContextValue => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
};
