import base44Entities from '@/api/base44/entities';
import type { Message, MessageThread, Paginated } from '../types';
import { logEvent } from './audit';

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

export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
}): Promise<any> {
  // Adjust entity names to match Base44 schema
  const created = await base44Entities.Message?.create?.({
    data: {
      threadId: input.threadId,
      senderId: input.senderId,
      body: input.body,
    },
  });

  await logEvent({
    actorId: input.senderId,
    action: 'messages:send',
    entityType: 'message',
    entityId: created?.id ?? null,
    metadata: { threadId: input.threadId, bodyLength: input.body?.length ?? 0 },
  });

  return created;
}

export async function hideMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  const updated = await base44Entities.Message?.update?.({
    where: { id: input.messageId },
    data: { isHidden: true, hiddenBy: input.moderatorId, hiddenReason: input.reason ?? null },
  });

  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'hide', reason: input.reason ?? null },
  });

  return updated;
}

export async function redactMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  const updated = await base44Entities.Message?.update?.({
    where: { id: input.messageId },
    data: { isRedacted: true, body: '[redacted]', redactedBy: input.moderatorId, redactedReason: input.reason ?? null },
  });

  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'redact', reason: input.reason ?? null },
  });

  return updated;
}

export async function deleteMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  const updated = await base44Entities.Message?.update?.({
    where: { id: input.messageId },
    data: { isDeleted: true, body: '[deleted]', deletedBy: input.moderatorId, deletedReason: input.reason ?? null },
  });

  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'delete', reason: input.reason ?? null },
  });

  return updated;
}
