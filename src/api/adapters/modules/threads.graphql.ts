import { nhost } from '@/lib/nhostClient';
import { createThreadWithParticipants } from '@/domains/messages';
import { logEvent } from './audit';
import type { InviteResult } from './invites';

type FunctionEnvelope<T> = { data?: T } | T;

const USE_SCOPED_THREAD_CREATE = (import.meta.env.VITE_USE_SCOPED_THREAD_CREATE ?? 'true') !== 'false';

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  participantEmails?: string[];
  initialMessage?: string;
}): Promise<{ thread: any; inviteResults: InviteResult[] }> {
  const uniq = Array.from(new Set([input.creatorId, ...(input.participantIds ?? [])]));

  if (USE_SCOPED_THREAD_CREATE) {
    const { res, error } = await nhost.functions.call('create-thread-scoped', {
      title: input.title,
      participantIds: uniq,
      participantEmails: input.participantEmails ?? [],
      initialMessage: input.initialMessage,
    });

    if (error) throw error;

    const payload = (res as FunctionEnvelope<any>)?.data ?? (res as any);
    if (payload?.ok === false) throw new Error('create-thread-scoped failed');
    const thread = payload?.thread ?? (payload?.threadId ? { id: payload.threadId, title: input.title } : null);

    await logEvent({
      actorId: input.creatorId,
      action: 'threads:create',
      entityType: 'message_thread',
      entityId: thread?.id ?? null,
      metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage), scoped: true },
    });

    return { thread, inviteResults: (payload?.results as InviteResult[]) ?? [] };
  }

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
    metadata: { participantCount: uniq.length, hasInitialMessage: Boolean(input.initialMessage), scoped: false },
  });

  return { thread, inviteResults: [] };
}
