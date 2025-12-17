import type { Message, MessageThread, Paginated } from '../types';
import { listMessageThreads as fetchMessageThreads, listMessages as fetchMessages } from '@/domains/messages';

export async function listThreads(params: Record<string, any> = {}): Promise<Paginated<MessageThread>> {
  const result = await fetchMessageThreads(params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}

export async function listMessages(threadId: string, params: Record<string, any> = {}): Promise<Paginated<Message>> {
  const result = await fetchMessages(threadId, params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}
