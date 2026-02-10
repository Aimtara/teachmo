import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getWebSocketUrl } from '@/config/websocket';
import { flushQueue } from '../utils/OfflineMessageQueue';
import { createLogger } from '@/utils/logger';
import { nhost } from '@/lib/nhostClient';

const WSContext = createContext<React.MutableRefObject<WebSocket | null> | null>(null);
const logger = createLogger('websocket');
const MAX_RECONNECT_ATTEMPTS = 8;

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);
  const currentToken = useRef<string | null>(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    let initialConnectionAttempted = false;

    const scheduleReconnect = () => {
      if (isUnmounted.current) return;
      if (reconnectTimer.current !== null) return;
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        logger.warn('WebSocket reconnect limit reached; stopping retries', {
          attempts: reconnectAttempts.current,
        });
        return;
      }

      reconnectAttempts.current += 1;
      const backoffMs = Math.min(1000 * 2 ** (reconnectAttempts.current - 1), 30000);
      reconnectTimer.current = window.setTimeout(() => {
        reconnectTimer.current = null;
        connect();
      }, backoffMs);
    };

    const connect = async () => {
      if (isUnmounted.current) return;
      if (isConnecting.current) return; // Prevent concurrent connection attempts

      isConnecting.current = true;
      
      try {
        // Get access token from Nhost
        const token = await nhost.auth.getAccessToken();
        
        if (!token) {
          logger.info('WebSocket connection deferred: no access token available');
          // Only retry on initial connection attempt, not after explicit logout
          if (!initialConnectionAttempted) {
            scheduleReconnect();
          }
          return;
        }

        initialConnectionAttempted = true;

        // Store the current token to detect auth changes
        currentToken.current = token;

        const wsUrl = getWebSocketUrl(token);
        if (!wsUrl) {
          logger.info('WebSocket disabled: no valid endpoint configured');
          return;
        }

        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        const handleOpen = () => {
          reconnectAttempts.current = 0;
          logger.info('WebSocket connected', { wsUrl: wsUrl.split('?')[0] }); // Log URL without token
          flushQueue(socket);
        };
        const handleClose = () => {
          logger.warn('WebSocket disconnected');
          scheduleReconnect();
        };
        const handleError = (event: Event) => {
          logger.warn('WebSocket error', {
            readyState: socket.readyState,
            eventType: event.type,
          });
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
          }
        };

        socket.addEventListener('open', handleOpen);
        socket.addEventListener('close', handleClose);
        socket.addEventListener('error', handleError);
      } catch (error) {
        logger.error('Error during WebSocket connection attempt', { error });
        scheduleReconnect();
      } finally {
        isConnecting.current = false;
      }
    };

    const disconnect = () => {
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      currentToken.current = null;
      reconnectAttempts.current = 0;
    };

    // Listen for auth state changes
    const unsubscribe = nhost.auth.onAuthStateChanged(async (_, session) => {
      const newToken = session?.accessToken || null;
      
      // If token changed (login, logout, or refresh), reconnect
      if (newToken !== currentToken.current) {
        logger.info('Auth state changed, reconnecting WebSocket');
        
        // Wait for any pending connection to complete before disconnecting
        while (isConnecting.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        disconnect();
        
        // Only reconnect if there's a valid token
        if (newToken) {
          await connect();
        }
      }
    });

    // Initial connection attempt
    connect().catch((error) => {
      logger.error('Failed to establish initial WebSocket connection', { error });
    });

    return () => {
      isUnmounted.current = true;
      unsubscribe();
      disconnect();
    };
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export const useWebSocket = () => useContext(WSContext);
