const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);

function maskEmail(email: string): string {
  const value = String(email || '').trim();
  if (!value.includes('@')) return value.replace(/.(?=.)/g, '*');

  const [local, domain] = value.split('@');
  const maskedLocal = local.length <= 1 ? `${local[0] ?? '*'}*` : `${local[0]}${'*'.repeat(local.length - 1)}`;
  const domainParts = domain.split('.');
  const domainName = domainParts[0] ?? '';
  const maskedDomainName = domainName.length <= 1 ? `${domainName || '*'}*` : `${domainName[0]}${'*'.repeat(domainName.length - 1)}`;
  const suffix = domainParts.length > 1 ? `.${domainParts.slice(1).join('.')}` : '';
  return `${maskedLocal}@${maskedDomainName}${suffix}`;
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const { threadId } = req.body ?? {};
  if (!threadId) return res.status(400).json({ ok: false, reason: 'thread_required' });

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
    const threadResp = await hasura(
      `query Thread($id: uuid!) { message_threads_by_pk(id: $id) { id created_by } }`,
      { id: threadId }
    );

    const thread = threadResp?.data?.message_threads_by_pk ?? null;
    if (!thread?.id) return res.status(404).json({ ok: false });
    if (!isAdminRole && String(thread.created_by) !== actorId) return res.status(403).json({ ok: false });

    const invitesResp = await hasura(
      `query Invites($threadId: uuid!) {
        message_thread_invites(where: { thread_id: { _eq: $threadId } }, order_by: { created_at: desc }) {
          id
          email
          expires_at
          accepted_at
          revoked_at
          last_sent_at
          send_count
        }
      }`,
      { threadId }
    );

    const invites = (invitesResp?.data?.message_thread_invites ?? []).map((invite: any) => ({
      id: invite.id,
      emailMasked: maskEmail(invite.email),
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      revokedAt: invite.revoked_at,
      lastSentAt: invite.last_sent_at,
      sendCount: invite.send_count,
    }));

    return res.status(200).json({ ok: true, invites });
  } catch (error) {
    console.error('list-thread-invites failed', error);
    return res.status(500).json({ ok: false });
  }
};
