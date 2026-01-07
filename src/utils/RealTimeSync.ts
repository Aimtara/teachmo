import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWebSocket } from '../providers/WebSocketProvider';
import { sendMessageStatusUpdate } from './MessageStatusUpdater';
import { createLogger } from '@/utils/logger';

const logger = createLogger('realtime-sync');

type StatusUpdatePayload = { messageId: string; status: 'delivered' | 'read' };

export const useRealTimeSync = (
  onMessage: (data: unknown) => void,
  onStatusUpdate?: (payload: StatusUpdatePayload) => void
) => {
  const wsRef = useWebSocket();

  useEffect(() => {
    const ws = wsRef?.current;
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          onMessage(data.payload);
          if (data.payload?.id) {
            sendMessageStatusUpdate(ws, String(data.payload.id), 'delivered');
          }
          toast(`New message from ${data.payload?.senderName || 'a contact'}`);
        } else if (data.type === 'status_update' && data.payload) {
          onStatusUpdate?.(data.payload as StatusUpdatePayload);
        } else if (data.type === 'typing' && data.payload?.senderId) {
          const typingEvent = new CustomEvent('userTyping', {
            detail: { senderId: data.payload.senderId },
          });
          window.dispatchEvent(typingEvent);
        } else {
          onMessage(data);
        }
      } catch (error) {
        logger.warn('Invalid WebSocket message', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [onMessage, onStatusUpdate, wsRef]);
};
