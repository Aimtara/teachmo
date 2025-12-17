import base44Entities from '@/api/base44/entities';
import type { Message, MessageThread, Paginated } from '../types';

export async function listThreads(params: Record<string, any> = {}): Promise<Paginated<MessageThread>> {
  const items = await base44Entities.MessageThread?.findMany?.(params);
  return { items: items ?? [], nextCursor: null };
}

export async function listMessages(threadId: string, params: Record<string, any> = {}): Promise<Paginated<Message>> {
  const items = await base44Entities.Message?.findMany?.({
    ...params,
    where: { ...(params.where ?? {}), threadId }
  });
  return { items: items ?? [], nextCursor: null };
}
