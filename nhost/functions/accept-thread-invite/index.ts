import crypto from 'crypto';
import { emailAllowedForSchool, getActorScope } from '../_shared/tenantScope';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const userId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!userId) return res.status(401).json({ ok: false });

  const { token } = req.body ?? {};
  const rawToken = String(token ?? '').trim();
  if (!rawToken) return res.status(200).json({ ok: true, threadId: null });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

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

  async function writeAudit(threadId: string, inviteId: string) {
    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: userId,
            action: 'invites:accept',
            entity_type: 'message_thread',
            entity_id: threadId,
            metadata: { threadId, inviteId },
          },
        }
      );
    } catch (error) {
      console.warn('accept-thread-invite audit failed', error);
    }
  }

  try {
    const tokenHash = sha256(rawToken);
    const now = new Date().toISOString();

    const inv = await hasura(
      `query Q($h: String!, $now: timestamptz!) {
        message_thread_invites(
          where: {
            token_hash: { _eq: $h },
            accepted_at: { _is_null: true },
            revoked_at: { _is_null: true },
            expires_at: { _gt: $now }
          },
          limit: 1
        ) {
          id
          thread_id
          email
          invited_by
          thread { school_id district_id }
        }
      }`,
      { h: tokenHash, now }
    );

    const invite = inv?.data?.message_thread_invites?.[0] ?? null;
    if (!invite?.id) return res.status(200).json({ ok: true, threadId: null });

    const userResp = await hasura(
      `query U($id: uuid!) { auth_users_by_pk(id: $id) { id email } }`,
      { id: userId }
    );

    const userEmail = String(userResp?.data?.auth_users_by_pk?.email ?? '').toLowerCase();

    if (!userEmail || userEmail !== String(invite.email).toLowerCase()) {
      return res.status(403).json({ ok: false });
    }

    const scope = await getActorScope(hasura, userId);
    const threadSchoolId = invite.thread?.school_id ? String(invite.thread.school_id) : null;
    const effectiveSchoolId = threadSchoolId ?? scope.schoolId;

    if (effectiveSchoolId) {
      const profileMatches = scope.schoolId && scope.schoolId === effectiveSchoolId;
      const directoryAllowed =
        profileMatches || (await emailAllowedForSchool(hasura, userEmail, effectiveSchoolId));

      if (!directoryAllowed) {
        return res.status(403).json({ ok: false });
      }
    }

    await hasura(
      `mutation P($obj: message_thread_participants_insert_input!) {
        insert_message_thread_participants_one(
          object: $obj,
          on_conflict: { constraint: message_thread_participants_unique, update_columns: [] }
        ) { id }
      }`,
      { obj: { thread_id: invite.thread_id, user_id: userId, role: 'member' } }
    );

    await hasura(
      `mutation A($id: uuid!, $uid: uuid!, $acceptedAt: timestamptz!) {
        update_message_thread_invites_by_pk(
          pk_columns: { id: $id },
          _set: { accepted_at: $acceptedAt, accepted_by: $uid }
        ) { id }
      }`,
      { id: invite.id, uid: userId, acceptedAt: now }
    );

    await writeAudit(invite.thread_id, invite.id);

    return res.status(200).json({ ok: true, threadId: invite.thread_id });
  } catch (error) {
    console.error('accept-thread-invite failed', error);
    return res.status(500).json({ ok: false });
  }
};
