import type { Message, MessageThread, Paginated } from '../types';
import {
  listMessageThreads as fetchMessageThreads,
  listMessages as fetchMessages,
  sendMessage as sendMessageDomain,
  moderateMessageHide,
  moderateMessageRedact,
  moderateMessageDelete,
} from '@/domains/messages';
import { logEvent } from './audit';

export async function listThreads(params: Record<string, unknown> = {}): Promise<Paginated<MessageThread>> {
  const result = await fetchMessageThreads(params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}

export async function listMessages(threadId: string, params: Record<string, unknown> = {}): Promise<Paginated<Message>> {
  const result = await fetchMessages(threadId, params);
  return Array.isArray(result) ? { items: result, nextCursor: null } : result;
}

export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
}): Promise<Message | null> {
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

export async function hideMessage(input: {
  messageId: string;
  moderatorId: string;
  reason?: string;
}) {
  const result = await moderateMessageHide(input);
  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'hide', reason: input.reason ?? null },
  });
  return result;
}

export async function redactMessage(input: {
  messageId: string;
  moderatorId: string;
  reason?: string;
}) {
  const result = await moderateMessageRedact(input);
  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'redact', reason: input.reason ?? null },
  });
  return result;
}

export async function deleteMessage(input: {
  messageId: string;
  moderatorId: string;
  reason?: string;
}) {
  const result = await moderateMessageDelete(input);
  await logEvent({
    actorId: input.moderatorId,
    action: 'messages:moderate',
    entityType: 'message',
    entityId: input.messageId,
    metadata: { kind: 'delete', reason: input.reason ?? null },
  });
  return result;
}
