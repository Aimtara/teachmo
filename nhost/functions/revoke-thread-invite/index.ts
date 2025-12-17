const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const { inviteId, reason } = req.body ?? {};
  if (!inviteId) return res.status(400).json({ ok: false, reason: 'invite_required' });

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

  const isAdminRole = role === 'admin' || role === 'district_admin' || role === 'system_admin' || role === 'school_admin';

  try {
    const inviteResp = await hasura(
      `query Invite($id: uuid!) {
        invite: message_thread_invites_by_pk(id: $id) {
          id
          thread_id
          invited_by
          email
          expires_at
          accepted_at
          revoked_at
        }
      }`,
      { id: inviteId }
    );

    const invite = inviteResp?.data?.invite ?? null;
    if (!invite?.id) return res.status(404).json({ ok: false });
    if (invite.accepted_at || invite.revoked_at) return res.status(400).json({ ok: false, reason: 'invite_closed' });

    const threadResp = await hasura(
      `query Thread($id: uuid!) { message_threads_by_pk(id: $id) { id created_by title } }`,
      { id: invite.thread_id }
    );

    const thread = threadResp?.data?.message_threads_by_pk ?? null;
    if (!thread?.id) return res.status(404).json({ ok: false });
    if (!isAdminRole && String(thread.created_by) !== actorId) return res.status(403).json({ ok: false });

    const nowIso = new Date().toISOString();
    await hasura(
      `mutation Revoke($id: uuid!, $actor: uuid!, $revokedAt: timestamptz!) {
        update_message_thread_invites_by_pk(
          pk_columns: { id: $id },
          _set: { revoked_at: $revokedAt, revoked_by: $actor }
        ) { id }
      }`,
      { id: inviteId, actor: actorId, revokedAt: nowIso }
    );

    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action: 'invites:revoke',
            entity_type: 'message_thread',
            entity_id: invite.thread_id,
            metadata: { threadId: invite.thread_id, inviteId, reason: reason ?? null },
          },
        }
      );
    } catch (error) {
      console.warn('revoke-thread-invite audit failed', error);
    }

    return res.status(200).json({ ok: true, inviteId });
  } catch (error) {
    console.error('revoke-thread-invite failed', error);
    return res.status(500).json({ ok: false });
  }
};
