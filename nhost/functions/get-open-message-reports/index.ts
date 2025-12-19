import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

function makeHasuraClient() {
  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) {
    throw new Error('Missing Hasura configuration');
  }

  return async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
      console.error('Hasura error', json.errors);
      throw new Error(json.errors[0]?.message ?? 'hasura_error');
    }
    return json;
  };
}

function isModeratorRole(role: string) {
  return ['admin', 'district_admin', 'school_admin', 'system_admin', 'teacher'].includes(String(role || '').toLowerCase());
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { status } = req.body ?? {};
  const normalizedStatus = status ? String(status).trim().toLowerCase() : 'open';

  const hasura = makeHasuraClient();

  try {
    const actorScope = await getActorScope(hasura, actorId);
    if (!isModeratorRole(actorScope.role)) return res.status(403).json({ ok: false, error: 'not_allowed' });

    const scopes = await getEffectiveScopes({
      hasura,
      districtId: actorScope.districtId,
      schoolId: actorScope.schoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);

    const where: any = {
      status: { _eq: normalizedStatus },
    };

    if (actorScope.schoolId) {
      where._and = [{ school_id: { _eq: actorScope.schoolId } }];
    } else if (actorScope.districtId) {
      where._and = [{ district_id: { _eq: actorScope.districtId } }];
    }

    const reportsResp = await hasura(
      `query Reports($where: message_reports_bool_exp!) {
        reports: message_reports(where: $where, order_by: { created_at: desc }, limit: 100) {
          id
          school_id
          district_id
          reporter_user_id
          thread_id
          message_id
          reason
          detail
          status
          severity
          created_at
          triaged_at
          triaged_by
          resolved_at
          resolved_by
        }
      }`,
      { where }
    );

    return res.status(200).json({ ok: true, reports: reportsResp?.data?.reports ?? [] });
  } catch (error: any) {
    console.error('get-open-message-reports failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
