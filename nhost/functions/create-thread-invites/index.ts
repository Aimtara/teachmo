import crypto from 'crypto';
import { sendEmail } from '../_shared/email';
import { enforceInviteRateLimits } from '../_shared/rateLimit';
import { emailAllowedForSchool, getActorScope } from '../_shared/tenantScope';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';

type InviteStatus = 'added_existing_user' | 'invited_new_user' | 'not_allowed';

type InviteResult = {
  email: string;
  status: InviteStatus;
  inviteId?: string;
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

  const { threadId, emails } = req.body ?? {};
  const normalized = Array.isArray(emails) ? emails.map(normEmail).filter(Boolean) : [];
  const list = Array.from(new Set(normalized));

  if (!threadId || list.length === 0) return res.status(200).json({ ok: true, results: [] });

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

  async function writeAudit(action: string, metadata: Record<string, any>) {
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
            entity_id: threadId,
            metadata,
          },
        }
      );
    } catch (error) {
      console.warn('create-thread-invites audit failed', error);
    }
  }

  async function fetchThread(): Promise<ThreadRecord | null> {
    const threadCheck = await hasura(
      `query T($id: uuid!) { message_threads_by_pk(id: $id) { id created_by school_id district_id } }`,
      { id: threadId }
    );

    const row = threadCheck?.data?.message_threads_by_pk;
    if (!row?.id) return null;
    return {
      id: String(row.id),
      created_by: row.created_by ? String(row.created_by) : null,
      school_id: row.school_id ? String(row.school_id) : null,
      district_id: row.district_id ? String(row.district_id) : null,
    };
  }

  try {
    const scope = await getActorScope(hasura, actorId);
    if (!scope.schoolId) return res.status(403).json({ ok: false });

    const thread = await fetchThread();
    if (!thread || !thread.id || thread.created_by !== actorId) {
      return res.status(403).json({ ok: false });
    }

    if (thread.school_id && thread.school_id !== scope.schoolId) {
      return res.status(403).json({ ok: false });
    }

    const targetSchoolId = thread.school_id ?? scope.schoolId;
    const targetDistrictId = thread.district_id ?? scope.districtId ?? null;

    if (!targetSchoolId) return res.status(403).json({ ok: false });

    const scopes = await getEffectiveScopes({ hasura, districtId: targetDistrictId, schoolId: targetSchoolId });
    assertScope(scopes, 'messaging.sendInvites', true);
    assertScope(scopes, 'messaging.useEmail', true);

    if (!thread.school_id || thread.district_id !== targetDistrictId) {
      try {
        await hasura(
          `mutation SetThreadTenant($id: uuid!, $schoolId: uuid, $districtId: uuid) {
            update_message_threads_by_pk(pk_columns: { id: $id }, _set: { school_id: $schoolId, district_id: $districtId }) { id }
          }`,
          { id: thread.id, schoolId: targetSchoolId, districtId: targetDistrictId }
        );
      } catch (error) {
        console.warn('create-thread-invites tenant pin failed', error);
      }
    }

    const pendingInvites: string[] = [];
    const existingUsers: { email: string; id: string }[] = [];
    const results: InviteResult[] = [];
    let deniedCount = 0;

    for (const email of list) {
      const isAllowed = await emailAllowedForSchool(hasura, email, targetSchoolId);
      if (!isAllowed) {
        results.push({ email, status: 'not_allowed' });
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
      const profileSchoolId = user?.profile?.school_id ? String(user.profile.school_id) : null;
      const matchesScope = !profileSchoolId || profileSchoolId === targetSchoolId;

      if (user?.id && matchesScope) {
        existingUsers.push({ email, id: String(user.id) });
      } else if (user?.id && !matchesScope) {
        results.push({ email, status: 'not_allowed' });
        deniedCount += 1;
      } else {
        pendingInvites.push(email);
      }
    }

    const rateLimitCheck = await enforceInviteRateLimits(hasura, actorId, pendingInvites.length);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        ok: false,
        reason: 'rate_limited',
        windowSeconds: rateLimitCheck.window?.windowSeconds,
        limit: rateLimitCheck.window?.limit,
      });
    }

    let addedExistingCount = 0;
    let invitedNewCount = 0;
    const sentInviteIds: string[] = [];

    for (const existing of existingUsers) {
      await hasura(
        `mutation P($obj: message_thread_participants_insert_input!) {
          insert_message_thread_participants_one(
            object: $obj,
            on_conflict: { constraint: message_thread_participants_unique, update_columns: [] }
          ) { id }
        }`,
        { obj: { thread_id: threadId, user_id: existing.id, role: 'member' } }
      );

      results.push({ email: existing.email, status: 'added_existing_user' });
      addedExistingCount += 1;
    }

    for (const email of pendingInvites) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString();

      const inviteResp = await hasura(
        `mutation I($obj: message_thread_invites_insert_input!) {
          insert_message_thread_invites_one(object: $obj) { id }
        }`,
        {
          obj: {
            thread_id: threadId,
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
        sentInviteIds.push(inviteId);
      }

      results.push({ email, status: 'invited_new_user', inviteId });
      invitedNewCount += 1;
    }

    const allowedCount = addedExistingCount + invitedNewCount;

    await writeAudit('invites:create', {
      allowedCount,
      deniedCount,
      invitedCount: invitedNewCount,
      addedCount: addedExistingCount,
    });

    if (sentInviteIds.length > 0) {
      await writeAudit('invites:send', {
        allowedCount,
        deniedCount,
        invitedCount: invitedNewCount,
        addedCount: addedExistingCount,
      });
    }

    return res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error('create-thread-invites failed', error);
    return res.status(500).json({ ok: false });
  }
};
