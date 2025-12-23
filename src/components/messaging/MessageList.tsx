import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTypingIndicator } from '../../providers/TypingIndicatorProvider';
import { useWebSocket } from '../../providers/WebSocketProvider';
import type { Message } from '../../types/Message';
import { useRealTimeSync } from '../../utils/RealTimeSync';
import { sendMessageStatusUpdate } from '../../utils/MessageStatusUpdater';

type MessageListProps = {
  initialMessages?: Message[];
  emptyState?: React.ReactNode;
  currentUserId?: string;
  threadPartnerId?: string;
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString();
};

const renderStatus = (status?: Message['status']) => {
  if (status === 'sent') return <span>✓</span>;
  if (status === 'delivered') return <span>✓✓</span>;
  if (status === 'read') return <span className="text-blue-500">✓✓ (Read)</span>;
  return null;
};

export default function MessageList({
  initialMessages = [],
  emptyState,
  currentUserId,
  threadPartnerId,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const lastReadIdRef = useRef<string | null>(null);
  const wsRef = useWebSocket();
  const { typingUserIds } = useTypingIndicator();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleIncomingMessage = useCallback((payload: unknown) => {
    const candidate = payload as Message;
    if (!candidate || !candidate.id) return;

    setMessages((prev) => [...prev, { ...candidate, unread: candidate.unread ?? true }]);
  }, []);

  const handleStatusUpdate = useCallback((payload: { messageId: string; status: 'delivered' | 'read' }) => {
    if (!payload?.messageId) return;

    setMessages((prev) =>
      prev.map((msg) =>
        String(msg.id) === payload.messageId ? { ...msg, status: payload.status, unread: payload.status !== 'read' } : msg
      )
    );
  }, []);

  useRealTimeSync(handleIncomingMessage, handleStatusUpdate);

  const sortedMessages = useMemo(() => {
    return messages
      .slice()
      .sort(
        (a, b) =>
          new Date(a.timestamp || (a as Message & { sentAt?: string }).sentAt || '').getTime() -
          new Date(b.timestamp || (b as Message & { sentAt?: string }).sentAt || '').getTime()
      );
  }, [messages]);

  useEffect(() => {
    const ws = wsRef?.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !currentUserId || sortedMessages.length === 0) return;

    const latestIncoming = [...sortedMessages]
      .reverse()
      .find((message) => message.senderId !== currentUserId && message.status !== 'read');

    if (latestIncoming && lastReadIdRef.current !== latestIncoming.id) {
      sendMessageStatusUpdate(ws, String(latestIncoming.id), 'read');
      lastReadIdRef.current = latestIncoming.id;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === latestIncoming.id ? { ...msg, status: 'read', unread: false } : msg))
      );
    }
  }, [currentUserId, sortedMessages, wsRef]);

  if (sortedMessages.length === 0) {
    return <div className="text-sm text-gray-500">{emptyState || 'No messages yet.'}</div>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {sortedMessages.map((message) => {
          const messageTimestamp =
            message.timestamp || (message as Message & { sentAt?: string }).sentAt || undefined;

          return (
            <li
              key={message.id}
              className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${
                message.unread ? 'border-s-4 border-s-sky-400' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold text-gray-700">
                  {message.senderName || message.senderId || 'Unknown sender'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatTimestamp(messageTimestamp)}</span>
                  {renderStatus(message.status)}
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-800 prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {message.attachments?.length ? (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={attachment.url ?? index} className="flex items-center gap-2">
                      {attachment.type === 'image' ? (
                        <img
                          alt={attachment.filename || 'Attachment'}
                          className="max-h-32 rounded border"
                          src={attachment.url}
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded border px-2 py-1 text-xs text-gray-700">
                          <span role="img" aria-label="document">
                            📎
                          </span>
                          <a className="underline" href={attachment.url} target="_blank" rel="noreferrer">
                            {attachment.filename || 'Document'}
                          </a>
                          {attachment.size ? (
                            <span className="text-gray-500">({(attachment.size / 1024).toFixed(1)} KB)</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {threadPartnerId && typingUserIds.has(threadPartnerId) ? (
        <div className="text-sm text-gray-500 italic mt-2">Typing...</div>
      ) : null}
    </div>
  );
}
