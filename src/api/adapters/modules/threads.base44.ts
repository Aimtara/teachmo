import { base44Entities } from '@/api/base44';
import { logEvent } from './audit';
import type { InviteResult } from './invites';

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  participantEmails?: string[];
  initialMessage?: string;
}): Promise<{ thread: any; inviteResults: InviteResult[] }> {
  const uniq = Array.from(new Set([input.creatorId, ...(input.participantIds ?? [])]));

  const thread = await base44Entities.MessageThread?.create?.({
    data: { title: input.title, createdBy: input.creatorId },
  });

  if (!thread?.id) {
    await logEvent({
      actorId: input.creatorId,
      action: 'threads:create',
      entityType: 'message_thread',
      entityId: thread?.id ?? null,
      metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage), status: 'thread-missing' },
    });

    return { thread: thread ?? null, inviteResults: [] };
  }

  // Participants: adjust entity name to match Base44 schema if it exists
  if (base44Entities.MessageThreadParticipant?.create) {
    await Promise.all(
      uniq.map((userId) =>
        base44Entities.MessageThreadParticipant.create({
          data: { threadId: thread.id, userId },
        })
      )
    );
  }

  // Optional first message
  if (input.initialMessage && base44Entities.Message?.create) {
    await base44Entities.Message.create({
      data: {
        threadId: thread.id,
        senderId: input.creatorId,
        body: input.initialMessage,
      },
    });
  }

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:create',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage) },
  });

  return { thread, inviteResults: [] };
}
