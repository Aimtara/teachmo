import crypto from 'crypto';
import { sendEmail } from '../_shared/email';
import { enforceInviteRateLimits } from '../_shared/rateLimit';
import { emailAllowedForSchool, getActorScope } from '../_shared/tenantScope';

type InviteStatus = 'added_existing_user' | 'invited_new_user' | 'not_allowed';

type InviteResult = {
  email: string;
  status: InviteStatus;
  inviteId?: string;
};

type ThreadRecord = {
  id: string;
  title?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  school_id?: string | null;
  district_id?: string | null;
};

const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);
const DAY_MS = 24 * 60 * 60 * 1000;

function normEmail(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase();
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const { title, participantEmails, participantIds, initialMessage } = req.body ?? {};
  const normalizedEmails = Array.isArray(participantEmails) ? participantEmails.map(normEmail).filter(Boolean) : [];
  const uniqueEmails = Array.from(new Set(normalizedEmails));
  const idList = Array.isArray(participantIds) ? participantIds.map((id) => String(id ?? '').trim()).filter(Boolean) : [];
  const uniqueIds = Array.from(new Set(idList.filter((id) => id && id !== actorId)));
  const initialBody = typeof initialMessage === 'string' && initialMessage.trim().length > 0 ? initialMessage : null;

  if (!title && !initialBody) {
    return res.status(400).json({ ok: false, reason: 'missing_title' });
  }

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  const APP_BASE_URL = process.env.APP_BASE_URL;
  const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS ?? 7);

  if (!HASURA_URL || !ADMIN_SECRET || !APP_BASE_URL) return res.status(500).json({ ok: false });

  const baseUrl = APP_BASE_URL.replace(/\/$/, '');
  const nowIso = new Date().toISOString();

  async function hasura(query: string, variables?: Record<string, any>) {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  async function writeAudit(action: string, metadata: Record<string, any>, threadId?: string) {
    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action,
            entity_type: 'message_thread',
            entity_id: threadId ?? null,
            metadata,
          },
        }
      );
    } catch (error) {
      console.warn('create-thread-scoped audit failed', error);
    }
  }

  try {
    const scope = await getActorScope(hasura, actorId);
    if (!scope.schoolId) return res.status(403).json({ ok: false });

    const allowedIds = new Set<string>();
    const deniedIds = new Set<string>();

    if (uniqueIds.length > 0) {
      const profileResp = await hasura(
        `query Profiles($ids: [uuid!]!) {
          auth_users(where: { id: { _in: $ids } }) {
            id
            email
            profile { school_id }
          }
        }`,
        { ids: uniqueIds }
      );

      const profiles = (profileResp?.data?.auth_users ?? []).map((row: any) => ({
        id: String(row.id),
        email: row.email ? String(row.email).toLowerCase() : null,
        schoolId: row?.profile?.school_id ? String(row.profile.school_id) : null,
      }));

      for (const userId of uniqueIds) {
        const entry = profiles.find((p: any) => p.id === userId);
        if (!entry) {
          deniedIds.add(userId);
          continue;
        }

        const profileMatches = entry.schoolId && entry.schoolId === scope.schoolId;
        const directoryAllowed =
          !profileMatches && entry.email ? await emailAllowedForSchool(hasura, entry.email, scope.schoolId) : profileMatches;

        if (profileMatches || directoryAllowed) {
          allowedIds.add(userId);
        } else {
          deniedIds.add(userId);
        }
      }
    }

    allowedIds.add(actorId);

    const existingUsersFromEmails: { email: string; id: string }[] = [];
    const inviteEmails: string[] = [];
    const inviteResults: InviteResult[] = [];
    let deniedCount = 0;

    for (const email of uniqueEmails) {
      const isAllowed = await emailAllowedForSchool(hasura, email, scope.schoolId);
      if (!isAllowed) {
        inviteResults.push({ email, status: 'not_allowed' });
        deniedCount += 1;
        continue;
      }

      const lookup = await hasura(
        `query U($email: citext!) {
          auth_users(where: { email: { _eq: $email } }, limit: 1) {
            id
            profile { school_id }
          }
        }`,
        { email }
      );

      const user = lookup?.data?.auth_users?.[0] ?? null;
      const profileSchool = user?.profile?.school_id ? String(user.profile.school_id) : null;
      const matchesScope = !profileSchool || profileSchool === scope.schoolId;

      if (user?.id && matchesScope) {
        existingUsersFromEmails.push({ email, id: String(user.id) });
      } else if (user?.id && !matchesScope) {
        inviteResults.push({ email, status: 'not_allowed' });
        deniedCount += 1;
      } else {
        inviteEmails.push(email);
      }
    }

    const rateLimitCheck = await enforceInviteRateLimits(hasura, actorId, inviteEmails.length);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        ok: false,
        reason: 'rate_limited',
        windowSeconds: rateLimitCheck.window?.windowSeconds,
        limit: rateLimitCheck.window?.limit,
      });
    }

    for (const user of existingUsersFromEmails) {
      allowedIds.add(user.id);
    }

    const participantData = Array.from(new Set(allowedIds)).map((userId) => ({ user_id: userId, role: 'member' }));

    const threadResp = await hasura(
      `mutation CreateThread($object: message_threads_insert_input!) {
        insert_message_threads_one(object: $object) {
          id
          title
          created_by
          created_at
          school_id
          district_id
        }
      }`,
      {
        object: {
          title: title || 'New Conversation',
          created_by: actorId,
          school_id: scope.schoolId,
          district_id: scope.districtId ?? null,
          participants: { data: participantData },
          ...(initialBody
            ? {
                messages: {
                  data: [
                    {
                      body: initialBody,
                      sender_id: actorId,
                    },
                  ],
                },
                last_message_preview: initialBody,
              }
            : {}),
        },
      }
    );

    const thread: ThreadRecord | null = threadResp?.data?.insert_message_threads_one ?? null;
    if (!thread?.id) return res.status(500).json({ ok: false });

    let invitedNewCount = 0;

    for (const user of existingUsersFromEmails) {
      inviteResults.push({ email: user.email, status: 'added_existing_user' });
    }

    for (const email of inviteEmails) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString();

      const inviteResp = await hasura(
        `mutation I($obj: message_thread_invites_insert_input!) {
          insert_message_thread_invites_one(object: $obj) { id }
        }`,
        {
          obj: {
            thread_id: thread.id,
            invited_by: actorId,
            email,
            token_hash: tokenHash,
            expires_at: expiresAt,
            metadata: { source: 'invite_by_email' },
          },
        }
      );

      const inviteId = inviteResp?.data?.insert_message_thread_invites_one?.id;
      const inviteUrl = `${baseUrl}/accept-invite?token=${rawToken}`;

      await sendEmail({
        to: email,
        subject: 'You have been invited to a Teachmo message thread',
        html: `<p>You have been invited to join a conversation.</p><p><a href="${inviteUrl}">Accept your invite</a> to join.</p>`,
        text: `You have been invited to join a conversation. Accept your invite: ${inviteUrl}`,
      });

      if (inviteId) {
        await hasura(
          `mutation UpdateInvite($id: uuid!, $sentAt: timestamptz!) {
            update_message_thread_invites_by_pk(
              pk_columns: { id: $id },
              _inc: { send_count: 1 },
              _set: { last_sent_at: $sentAt }
            ) { id send_count }
          }`,
          { id: inviteId, sentAt: nowIso }
        );
      }

      inviteResults.push({ email, status: 'invited_new_user', inviteId });
      invitedNewCount += 1;
    }

    await writeAudit(
      'threads:create_scoped',
      {
        participantCount: participantData.length,
        inviteCount: inviteEmails.length,
        deniedCount,
        deniedParticipantCount: deniedIds.size,
      },
      thread.id
    );

    if (inviteEmails.length > 0) {
      await writeAudit(
        'invites:create',
        {
          allowedCount: existingUsersFromEmails.length + inviteEmails.length,
          deniedCount,
          invitedCount: invitedNewCount,
          addedCount: existingUsersFromEmails.length,
        },
        thread.id
      );
    }

    return res.status(200).json({ ok: true, thread, results: inviteResults });
  } catch (error) {
    console.error('create-thread-scoped failed', error);
    return res.status(500).json({ ok: false });
  }
};
