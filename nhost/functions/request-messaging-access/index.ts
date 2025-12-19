import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';
import { notifyUserEvent } from '../_shared/notifier';

const ALLOWED_TARGET_ROLES = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin', 'staff']);

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

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const requesterUserId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!requesterUserId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { schoolId, targetUserId, note } = req.body ?? {};
  const normalizedSchoolId = String(schoolId ?? '').trim();
  const normalizedTargetId = String(targetUserId ?? '').trim();

  if (!normalizedSchoolId || !normalizedTargetId) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  const hasura = makeHasuraClient();
  const appBase = String(process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

  try {
    const actorScope = await getActorScope(hasura, requesterUserId);
    const scopes = await getEffectiveScopes({
      hasura,
      districtId: actorScope.districtId,
      schoolId: normalizedSchoolId,
    });

    assertScope(scopes, 'messaging.enabled', true);
    assertScope(scopes, 'messaging.parentToTeacherRequests', true);
    assertScope(scopes, 'messaging.requireApproval', true);

    const linkResp = await hasura(
      `query Link($userId: uuid!, $schoolId: uuid!) {
        link: directory_contact_links(
          where: { user_id: { _eq: $userId }, school_id: { _eq: $schoolId }, link_status: { _eq: "linked" } },
          limit: 1
        ) {
          id
          school_id
          district_id
        }
      }`,
      { userId: requesterUserId, schoolId: normalizedSchoolId }
    );

    const link = linkResp?.data?.link?.[0] ?? null;
    if (!link) return res.status(403).json({ ok: false, error: 'not_linked_to_school' });

    const targetResp = await hasura(
      `query Target($id: uuid!, $requester: uuid!) {
        profile: user_profiles_by_pk(user_id: $id) {
          user_id
          role
          school_id
          district_id
        }
        user: auth_users_by_pk(id: $id) { id display_name email }
        requester: auth_users_by_pk(id: $requester) { id display_name }
      }`,
      { id: normalizedTargetId, requester: requesterUserId }
    );

    const targetProfile = targetResp?.data?.profile;
    if (!targetProfile) return res.status(404).json({ ok: false, error: 'target_not_found' });

    const targetRole = String(targetProfile.role ?? '').toLowerCase();
    if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
      return res.status(403).json({ ok: false, error: 'target_not_allowed' });
    }

    if (targetProfile.school_id && targetProfile.school_id !== normalizedSchoolId) {
      return res.status(403).json({ ok: false, error: 'school_mismatch' });
    }

    const districtId = targetProfile.district_id ?? link?.district_id ?? actorScope.districtId ?? null;
    const noteValue = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

    const insertResp = await hasura(
      `mutation InsertRequest($object: messaging_requests_insert_input!) {
        insert_messaging_requests_one(
          object: $object,
          on_conflict: {
            constraint: messaging_requests_school_id_requester_user_id_target_user_id_status_key,
            update_columns: [reason, metadata, expires_at, decided_at, decided_by, status]
          }
        ) {
          id
          requester_user_id
          target_user_id
          school_id
          status
        }
      }`,
      {
        object: {
          school_id: normalizedSchoolId,
          district_id: districtId,
          requester_user_id: requesterUserId,
          target_user_id: normalizedTargetId,
          status: 'pending',
          metadata: noteValue ? { note: noteValue } : {},
        },
      }
    );

    const request = insertResp?.data?.insert_messaging_requests_one;
    if (!request?.id) return res.status(500).json({ ok: false, error: 'request_not_created' });

    const requesterName = targetResp?.data?.requester?.display_name || 'A parent';
    const linkUrl = appBase ? `${appBase}/messages/requests` : null;

    await notifyUserEvent({
      hasura,
      userId: normalizedTargetId,
      type: 'messaging.request_pending',
      title: 'New messaging request',
      body: `${requesterName} requested to message you.`,
      severity: 'info',
      metadata: {
        requestId: request.id,
        schoolId: normalizedSchoolId,
        note: noteValue,
        links: linkUrl ? { request: linkUrl } : {},
      },
      dedupeKey: `messaging.request_pending:${request.id}`,
    });

    return res.status(200).json({ ok: true, requestId: request.id });
  } catch (error: any) {
    console.error('request-messaging-access failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
