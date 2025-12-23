import React, { useEffect, useMemo, useState } from 'react';
import { useRealTimeSync } from '../../utils/RealTimeSync';

type MessagePayload = {
  id: string | number;
  content: string;
  sender?: string;
  sentAt?: string;
};

type MessageListProps = {
  initialMessages?: MessagePayload[];
  emptyState?: React.ReactNode;
};

function isMessageEvent(data: unknown): data is { type: string; payload?: MessagePayload } {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as { type?: unknown };
  return typeof candidate.type === 'string';
}

export default function MessageList({ initialMessages = [], emptyState }: MessageListProps) {
  const [messages, setMessages] = useState<MessagePayload[]>(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useRealTimeSync((data) => {
    if (isMessageEvent(data) && data.type === 'new_message' && data.payload) {
      setMessages((prev) => [...prev, data.payload]);
    }
  });

  const sortedMessages = useMemo(
    () => messages.slice().sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? '')),
    [messages]
  );

  if (sortedMessages.length === 0) {
    return <div className="text-sm text-gray-500">{emptyState || 'No messages yet.'}</div>;
  }

  return (
    <ul className="space-y-3">
      {sortedMessages.map((message) => (
        <li key={message.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{message.sender || 'Unknown sender'}</span>
            {message.sentAt ? <time dateTime={message.sentAt}>{message.sentAt}</time> : null}
          </div>
          <p className="mt-1 text-sm text-gray-800">{message.content}</p>
        </li>
      ))}
    </ul>
  );
}
