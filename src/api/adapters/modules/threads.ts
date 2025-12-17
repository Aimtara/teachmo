import * as base44Impl from './threads.base44';
import * as graphqlImpl from './threads.graphql';
import * as InvitesAPI from './invites';
import { logEvent } from './audit';

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

  const thread = await createThread({
    title: input.title,
    creatorId: input.creatorId,
    participantIds: [],
    initialMessage: input.initialMessage,
  });

  const inviteResults =
    thread?.id && emails.length > 0
      ? ((await InvitesAPI.createThreadInvites({ threadId: thread.id, emails }))?.results ?? [])
      : [];
  const addedExistingCount = inviteResults.filter((result) => result.status === 'added_existing_user').length;
  const invitedNewCount = inviteResults.filter((result) => result.status === 'invited_new_user').length;

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:invite',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: {
      invitedCount: inviteResults.length,
      addedExistingCount,
      invitedNewCount,
      requestedCount: emails.length,
    },
  });

  return { thread, invites: inviteResults };
}
