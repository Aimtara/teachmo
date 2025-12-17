import { createThreadWithParticipants } from '@/domains/messages';
import { logEvent } from './audit';

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  initialMessage?: string;
}) {
  // Ensure creator is included as a participant
  const uniq = Array.from(new Set([input.creatorId, ...(input.participantIds ?? [])]));

  const thread = await createThreadWithParticipants({
    title: input.title,
    participantIds: uniq,
    initialMessage: input.initialMessage,
  });

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:create',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage) },
  });

  return thread;
}
