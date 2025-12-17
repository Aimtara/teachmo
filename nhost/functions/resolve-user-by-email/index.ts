import { emailAllowedForSchool, getActorScope } from '../_shared/tenantScope';

const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ ok: false });
  }

  const { email } = req.body ?? {};
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return res.status(200).json({ ok: true, userId: null });
  }

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!HASURA_URL || !ADMIN_SECRET) {
    return res.status(500).json({ ok: false });
  }

  const hasura = async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  };

  const userQuery = `
    query FindUser($email: citext!) {
      users: auth_users(where: { email: { _eq: $email } }, limit: 1) {
        id
      }
    }
  `;

  try {
    const scope = await getActorScope(hasura, actorId);
    if (!scope.schoolId) {
      return res.status(200).json({ ok: true, userId: null });
    }

    const allowed = await emailAllowedForSchool(hasura, normalized, scope.schoolId);
    if (!allowed) {
      return res.status(200).json({ ok: true, userId: null });
    }

    const json = await hasura(userQuery, { email: normalized });
    const userId = json?.data?.users?.[0]?.id ?? null;

    return res.status(200).json({ ok: true, userId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('resolve-user-by-email failed', error);
    return res.status(500).json({ ok: false });
  }
};
