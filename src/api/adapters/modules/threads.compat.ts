import { apiClient } from '@/services/core/client';
import { logEvent } from './audit';
import type { MessageThread } from '../types';
import type { InviteResult } from './invites';

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  participantEmails?: string[];
  initialMessage?: string;
}): Promise<{ thread: MessageThread | null | undefined; inviteResults: InviteResult[] }> {
  const uniq = Array.from(new Set([input.creatorId, ...(input.participantIds ?? [])]));

  const thread = await apiClient.entity.create<MessageThread>('MessageThread', {
    data: { title: input.title, createdBy: input.creatorId }
  });

  if (!thread?.id) {
    await logEvent({
      actorId: input.creatorId,
      action: 'threads:create',
      entityType: 'message_thread',
      entityId: thread?.id ?? null,
      metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage), status: 'thread-missing' }
    });

    return { thread: thread ?? null, inviteResults: [] };
  }

  await Promise.all(
    uniq.map((userId) =>
      apiClient.entity.create('MessageThreadParticipant', {
        data: { threadId: thread.id, userId }
      })
    )
  );

  if (input.initialMessage) {
    await apiClient.entity.create('Message', {
      data: {
        threadId: thread.id,
        senderId: input.creatorId,
        body: input.initialMessage
      }
    });
  }

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:create',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage) }
  });

  return { thread, inviteResults: [] };
}
