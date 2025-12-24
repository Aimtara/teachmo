import React, { useCallback, useMemo, useState } from 'react';
import { enqueueMessage } from '../../utils/OfflineMessageQueue';
import { useWebSocket } from '../../providers/WebSocketProvider';

type MessageInputProps = {
  user: { id: string };
  threadPartnerId: string;
  placeholder?: string;
  onSent?: (payload: { id: string; content: string; senderId: string; recipientId: string; timestamp: string }) => void;
};

const MIN_MESSAGE_LENGTH = 1;
const createMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function MessageInput({ user, threadPartnerId, placeholder = 'Type a message…', onSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const wsRef = useWebSocket();
  const ws = wsRef?.current;

  const trimmedMessage = useMemo(() => message.trim(), [message]);

  const handleTyping = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', payload: { senderId: user.id } }));
    }
  }, [user.id, ws]);

  const sendMessage = useCallback(() => {
    if (!trimmedMessage || trimmedMessage.length < MIN_MESSAGE_LENGTH) return;

    const payload = {
      type: 'new_message',
      payload: {
        id: createMessageId(),
        content: trimmedMessage,
        senderId: user.id,
        recipientId: threadPartnerId,
        timestamp: new Date().toISOString(),
      },
    };

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      enqueueMessage({ id: payload.payload.id, payload });
    }

    setMessage('');
    onSent?.(payload.payload);
  }, [onSent, threadPartnerId, trimmedMessage, user.id, ws]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          aria-label="Message input"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          onChange={(event) => {
            setMessage(event.target.value);
            handleTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder={placeholder}
          value={message}
        />
        <button
          aria-label="Send message"
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!trimmedMessage}
          onClick={sendMessage}
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}
