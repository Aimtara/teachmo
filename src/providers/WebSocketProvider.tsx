import React, { createContext, useContext, useEffect, useRef } from 'react';

const WSContext = createContext<React.MutableRefObject<WebSocket | null> | null>(null);

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('wss://api.teachmo.dev/ws'); // TODO: Replace with actual endpoint
    ws.current = socket;

    const handleOpen = () => console.log('WebSocket connected');
    const handleClose = () => console.log('WebSocket disconnected');

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.close();
      ws.current = null;
    };
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export const useWebSocket = () => useContext(WSContext);
