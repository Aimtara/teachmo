import { notifyDirectoryIssue } from '../_shared/notifier';

const allowedRoles = new Set(['admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const authHeader = String(req.headers['authorization'] ?? '');
  const cronToken = String(process.env.DIRECTORY_SYNC_TOKEN ?? '');
  const isInternal = Boolean(cronToken) && authHeader === `Bearer ${cronToken}`;

  if (!isInternal && (!actorId || !allowedRoles.has(role))) {
    return res.status(403).json({ ok: false });
  }

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const {
    schoolId,
    districtId = null,
    type,
    severity,
    title,
    body,
    entityType = null,
    entityId = null,
    dedupeKey = null,
    metadata = {},
  } = req.body ?? {};

  if (!schoolId || !type || !severity || !title || !body || !entityType || !entityId) {
    return res.status(400).json({ ok: false, reason: 'invalid_payload' });
  }

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
    const result = await notifyDirectoryIssue({
      hasura,
      schoolId,
      districtId,
      type,
      severity,
      title,
      body,
      entityType,
      entityId,
      dedupeKey,
      metadata,
    });

    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('notify-directory-sync-issue failed', error);
    return res.status(500).json({ ok: false, reason: 'notify_failed', message: error?.message ?? 'notify_failed' });
  }
};
