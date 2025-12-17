import * as base44Impl from './threads.base44';
import * as graphqlImpl from './threads.graphql';
import { logEvent } from './audit';
import { resolveUserIdByEmail } from './userLookup';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_MESSAGES);

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  initialMessage?: string;
}) {
  return USE_GRAPHQL ? graphqlImpl.createThread(input) : base44Impl.createThread(input);
}

export async function createThreadByEmails(input: {
  title: string;
  creatorId: string;
  participantEmails: string[];
  initialMessage?: string;
}) {
  const emails = (input.participantEmails ?? [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);

  await logEvent({
    actorId: input.creatorId,
    action: 'users:lookup_email',
    entityType: 'user',
    entityId: null,
    metadata: { count: emails.length },
  });

  const ids = await Promise.all(emails.map(resolveUserIdByEmail));
  const participantIds = ids.filter((id): id is string => Boolean(id));

  const thread = await createThread({
    title: input.title,
    creatorId: input.creatorId,
    participantIds,
    initialMessage: input.initialMessage,
  });

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:invite',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: { invitedCount: participantIds.length },
  });

  return thread;
}
