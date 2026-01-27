import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getWebSocketUrl } from '@/config/websocket';
import { flushQueue } from '../utils/OfflineMessageQueue';
import { createLogger } from '@/utils/logger';

const WSContext = createContext<React.MutableRefObject<WebSocket | null> | null>(null);
const logger = createLogger('websocket');

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);

  useEffect(() => {
    const scheduleReconnect = () => {
      if (isUnmounted.current) return;
      if (reconnectTimer.current !== null) return;

      reconnectAttempts.current += 1;
      const backoffMs = Math.min(1000 * 2 ** (reconnectAttempts.current - 1), 30000);
      reconnectTimer.current = window.setTimeout(() => {
        reconnectTimer.current = null;
        connect();
      }, backoffMs);
    };

    const connect = () => {
      if (isUnmounted.current) return;

      const socket = new WebSocket(getWebSocketUrl());
      ws.current = socket;

      const handleOpen = () => {
        reconnectAttempts.current = 0;
        logger.info('WebSocket connected');
        flushQueue(socket);
      };
      const handleClose = () => {
        logger.warn('WebSocket disconnected');
        scheduleReconnect();
      };
      const handleError = (event: Event) => {
        logger.error('WebSocket error', event);
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('close', handleClose);
      socket.addEventListener('error', handleError);
    };

    connect();

    return () => {
      isUnmounted.current = true;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (ws.current) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export const useWebSocket = () => useContext(WSContext);
