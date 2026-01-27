const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);
const DEFAULT_SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const authHeader = String(req.headers['authorization'] ?? '');

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  const cronToken = String(process.env.INVITE_CRON_TOKEN ?? '');

  const isCron = Boolean(cronToken) && authHeader === `Bearer ${cronToken}`;

  if (!isCron && (!actorId || !allowedRoles.has(role))) return res.status(403).json({ ok: false });
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

  try {
    const now = new Date().toISOString();
    const expireResp = await hasura(
      `mutation Expire($now: timestamptz!) {
        update_invites(
          where: { status: { _in: ["pending", "sent"] }, expires_at: { _lt: $now } },
          _set: { status: "expired" }
        ) { affected_rows }
      }`,
      { now }
    );

    const expiredCount = expireResp?.data?.update_invites?.affected_rows ?? 0;

    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId || process.env.SYSTEM_ACTOR_ID || DEFAULT_SYSTEM_ACTOR,
            action: 'invites:expire',
            entity_type: 'invite',
            entity_id: null,
            metadata: { expiredCount, mode: isCron ? 'cron' : 'manual' },
          },
        }
      );
    } catch (auditError) {
      console.warn('expire-invites audit failed', auditError);
    }

    return res.status(200).json({ ok: true, expired: expiredCount });
  } catch (error: any) {
    console.error('expire-invites failed', error);
    return res.status(500).json({ ok: false, reason: error?.message ?? 'failed' });
  }
};
