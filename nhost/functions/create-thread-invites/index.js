import crypto from 'crypto';

const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);
const DAY_MS = 24 * 60 * 60 * 1000;

function normEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async (req, res) => {
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

  async function hasura(query, variables) {
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

  async function writeAudit(metadata) {
    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action: 'invites:create',
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

  try {
    const threadCheck = await hasura(
      `query T($id: uuid!) { message_threads_by_pk(id: $id) { id created_by } }`,
      { id: threadId }
    );

    const createdBy = threadCheck?.data?.message_threads_by_pk?.created_by ?? null;
    if (!createdBy || String(createdBy) !== actorId) {
      return res.status(403).json({ ok: false });
    }

    const results = [];
    let addedExistingCount = 0;
    let invitedNewCount = 0;

    for (const email of list) {
      const lookup = await hasura(
        `query U($email: citext!) { auth_users(where: { email: { _eq: $email } }, limit: 1) { id } }`,
        { email }
      );

      const user = lookup?.data?.auth_users?.[0] ?? null;

      if (user?.id) {
        await hasura(
          `mutation P($obj: message_thread_participants_insert_input!) {
            insert_message_thread_participants_one(
              object: $obj,
              on_conflict: { constraint: message_thread_participants_unique, update_columns: [] }
            ) { id }
          }`,
          { obj: { thread_id: threadId, user_id: user.id, role: 'member' } }
        );

        results.push({ email, status: 'added_existing_user' });
        addedExistingCount += 1;
        continue;
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString();

      await hasura(
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

      const inviteUrl = `${baseUrl}/accept-invite?token=${rawToken}`;
      results.push({ email, status: 'invited_new_user', inviteUrl });
      invitedNewCount += 1;
    }

    await writeAudit({ count: list.length, addedExistingCount, invitedNewCount, threadId });

    return res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error('create-thread-invites failed', error);
    return res.status(500).json({ ok: false });
  }
};
