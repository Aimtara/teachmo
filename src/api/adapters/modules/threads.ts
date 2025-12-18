import * as base44Impl from './threads.base44';
import * as graphqlImpl from './threads.graphql';
import * as InvitesAPI from './invites';
import { logEvent } from './audit';
import type { InviteResult } from './invites';
import type { MessageThread } from '../types';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_MESSAGES);

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  participantEmails?: string[];
  initialMessage?: string;
}): Promise<{ thread: MessageThread | { id: string; title?: string } | null | undefined; inviteResults: InviteResult[] }> {
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

  const { thread, inviteResults: immediateInviteResults } = await createThread({
    title: input.title,
    creatorId: input.creatorId,
    participantIds: [],
    participantEmails: emails,
    initialMessage: input.initialMessage,
  });

  let inviteResults: InviteResult[] = immediateInviteResults ?? [];

  if ((!inviteResults || inviteResults.length === 0) && thread?.id && emails.length > 0) {
    const response = await InvitesAPI.createThreadInvites({ threadId: thread.id, emails });
    inviteResults = response?.results ?? [];
  }

  const addedExistingCount = inviteResults.filter((result) => result.status === 'added_existing_user').length;
  const invitedNewCount = inviteResults.filter((result) => result.status === 'invited_new_user').length;
  const deniedCount = inviteResults.filter((result) => result.status === 'not_allowed').length;

  await logEvent({
    actorId: input.creatorId,
    action: 'threads:invite',
    entityType: 'message_thread',
    entityId: thread?.id ?? null,
    metadata: {
      invitedCount: inviteResults.length,
      addedExistingCount,
      invitedNewCount,
      deniedCount,
      requestedCount: emails.length,
    },
  });

  return { thread, invites: inviteResults };
}
