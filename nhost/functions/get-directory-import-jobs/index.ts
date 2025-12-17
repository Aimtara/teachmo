import { getActorScope } from '../_shared/tenantScope';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { schoolId } = req.body ?? {};

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

  let scope: Awaited<ReturnType<typeof getActorScope>> | null = null;
  let sid = String(schoolId ?? '').trim();
  if (!sid) {
    scope = await getActorScope(hasura, actorId);
    sid = scope.schoolId ?? '';
  }

  if (!sid) return res.status(400).json({ ok: false, reason: 'school_required' });

  try {
    const resp = await hasura(
      `query Jobs($schoolId: uuid!) {
        directory_import_jobs(where: { school_id: { _eq: $schoolId } }, order_by: { started_at: desc }, limit: 20) {
          id
          actor_id
          school_id
          district_id
          source_type
          source_ref
          source_hash
          status
          started_at
          finished_at
          stats
          errors
        }
      }`,
      { schoolId: sid }
    );

    const jobs = resp?.data?.directory_import_jobs ?? [];
    return res.status(200).json({ ok: true, jobs });
  } catch (error) {
    console.error('get-directory-import-jobs failed', error);
    return res.status(500).json({ ok: false });
  }
};
