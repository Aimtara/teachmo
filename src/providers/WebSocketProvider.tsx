import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getWebSocketUrl } from '@/config/websocket';
import { flushQueue } from '../utils/OfflineMessageQueue';

const WSContext = createContext<React.MutableRefObject<WebSocket | null> | null>(null);

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl());
    ws.current = socket;

    const handleOpen = () => {
      console.log('WebSocket connected');
      flushQueue(socket);
    };
    const handleClose = () => console.log('WebSocket disconnected');
    const handleError = (event: Event) => {
      console.error('WebSocket error', event);
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      socket.close();
      ws.current = null;
    };
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export const useWebSocket = () => useContext(WSContext);
