import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState, useGlobalDispatch } from './GlobalStateManager';
import { useToast } from '@/components/ui/use-toast';

export const OfflineBanner = () => {
  const { isOnline } = useGlobalState();
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    // Show banner immediately if offline, hide if online
    setShowBanner(!isOnline);
  }, [isOnline]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-0 left-0 right-0 z-50 p-4"
        >
          <Alert className="bg-orange-50 border-orange-200 text-orange-800 shadow-lg max-w-md mx-auto">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You're currently offline</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-orange-800 hover:bg-orange-100"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const OfflineStorage = {
  set: (key, data) => {
    try {
      localStorage.setItem(`teachmo_offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  },
  get: (key, maxAge = 24 * 60 * 60 * 1000) => {
    try {
      const stored = localStorage.getItem(`teachmo_offline_${key}`);
      if (!stored) return null;
      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(`teachmo_offline_${key}`);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
      return null;
    }
  },
  remove: (key) => {
    localStorage.removeItem(`teachmo_offline_${key}`);
  },
  clear: () => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('teachmo_offline_'))
      .forEach(key => localStorage.removeItem(key));
  }
};

export const OfflineManager = () => {
  const { isOnline, syncQueue } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const { toast } = useToast();

  const updateOnlineStatus = useCallback(() => {
    const online = navigator.onLine;
    if (isOnline !== online) {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: online });
      toast({
        title: online ? "You're back online!" : "You've gone offline",
        description: online ? 'Your data will now sync.' : 'Changes will be saved and synced later.',
        variant: online ? 'default' : 'destructive',
      });
    }
  }, [isOnline, dispatch, toast]);

  useEffect(() => {
    // Initial check
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      console.log(`Processing ${syncQueue.length} items from sync queue.`);
      toast({
        title: 'Syncing Offline Changes',
        description: `Successfully synced ${syncQueue.length} items.`,
      });
      dispatch({ type: 'CLEAR_SYNC_QUEUE' });
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date().toISOString() });
    }
  }, [isOnline, syncQueue, dispatch, toast]);

  return null;
};

export const useOfflineAction = (actionFn, options = {}) => {
  const { isOnline } = useGlobalState();
  const dispatch = useGlobalDispatch();

  return useCallback(async (...args) => {
    if (isOnline) {
      return actionFn(...args);
    } else {
      dispatch({
        type: 'ADD_TO_SYNC_QUEUE',
        payload: {
          fn: () => actionFn(...args),
          options,
          timestamp: new Date().toISOString(),
        },
      });
      return { status: 'queued', message: 'Action queued for sync.' };
    }
  }, [isOnline, dispatch, actionFn, options]);
};