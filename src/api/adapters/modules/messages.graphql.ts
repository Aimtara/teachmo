import type { Message, MessageThread, Paginated } from '../types';
import { listMessageThreads as fetchMessageThreads, listMessages as fetchMessages, sendMessage as sendMessageDomain } from '@/domains/messages';
import { logEvent } from './audit';

export async function listThreads(params: Record<string, any> = {}): Promise<Paginated<MessageThread>> {
  const result = await fetchMessageThreads(params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}

export async function listMessages(threadId: string, params: Record<string, any> = {}): Promise<Paginated<Message>> {
  const result = await fetchMessages(threadId, params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}

export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
}): Promise<any> {
  const result = await sendMessageDomain(input);

  // Audit: do NOT include raw body
  await logEvent({
    actorId: input.senderId,
    action: 'messages:send',
    entityType: 'message',
    entityId: result?.id ?? null,
    metadata: { threadId: input.threadId, bodyLength: input.body?.length ?? 0 },
  });

  return result;
}
