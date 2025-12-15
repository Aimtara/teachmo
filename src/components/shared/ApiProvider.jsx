import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/api/entities';
import { createLogger } from '@/utils/logger';

const apiProviderLogger = createLogger('ApiProvider');

// Global API context for app-wide state and configuration
const ApiContext = createContext({});

// Provider component for global API configuration
export function ApiProvider({ children }) {
  const { toast } = useToast();
  const globalCache = useRef(new Map());
  const rateLimitTracker = useRef(new Map());

  // Global error handler for critical errors
  const handleCriticalError = useCallback((error, context) => {
    apiProviderLogger.error(`Critical API Error [${context}]:`, error);
    
    // Log to external service in production
    // Note: Using window.location.hostname to detect environment instead of process.env
    if (window.location.hostname !== 'localhost') {
      // Integration point for error reporting service
      // e.g., Sentry, LogRocket, etc.
    }
    
    // For auth errors, force logout
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      User.logout().catch(() => {}); // Silent logout
      window.location.href = '/Landing';
    }
  }, []);

  // Global cache management
  const cacheManager = {
    get: (key) => globalCache.current.get(key),
    set: (key, value, ttl = 300000) => { // 5 minutes default TTL
      globalCache.current.set(key, {
        data: value,
        expires: Date.now() + ttl
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
      return cached && cached.expires > Date.now();
    }
  };

  // Rate limiting tracking
  const rateLimiter = {
    canProceed: (endpoint) => {
      const now = Date.now();
      const tracker = rateLimitTracker.current.get(endpoint) || { count: 0, resetTime: now + 60000 };
      
      if (now > tracker.resetTime) {
        tracker.count = 0;
        tracker.resetTime = now + 60000;
      }
      
      if (tracker.count >= 60) { // 60 requests per minute
        return false;
      }
      
      tracker.count++;
      rateLimitTracker.current.set(endpoint, tracker);
      return true;
    }
  };

  // Network status monitoring
  const networkStatus = {
    isOnline: navigator.onLine,
    lastCheck: Date.now()
  };

  // Update network status
  React.useEffect(() => {
    const handleOnline = () => {
      networkStatus.isOnline = true;
      networkStatus.lastCheck = Date.now();
    };
    
    const handleOffline = () => {
      networkStatus.isOnline = false;
      networkStatus.lastCheck = Date.now();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue = {
    handleCriticalError,
    cacheManager,
    rateLimiter,
    networkStatus,
    toast
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
}

// Hook to access global API context
export const useApiContext = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
};