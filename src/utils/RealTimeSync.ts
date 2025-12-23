import { useEffect } from 'react';
import { useWebSocket } from '../providers/WebSocketProvider';

export const useRealTimeSync = (onMessage: (data: unknown) => void) => {
  const wsRef = useWebSocket();

  useEffect(() => {
    const ws = wsRef?.current;
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Invalid WebSocket message', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [onMessage, wsRef]);
};
