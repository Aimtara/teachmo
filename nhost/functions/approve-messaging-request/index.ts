import { getActorScope } from '../_shared/tenantScope';
import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage } from '../_shared/hasuraTypes';

const logger = createLogger('approve-messaging-request');

const ADMIN_ROLES = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

type GraphQLError = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
};

type HasuraResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

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

    const json = await response.json() as HasuraResponse<unknown>;
    if (json.errors && json.errors.length > 0) {
      console.error('Hasura error', json.errors);
      throw new Error(json.errors[0].message);
    const json = await response.json();
    if (json.errors) {
      logger.error('Hasura error', json.errors);
      throw new Error(getHasuraErrorMessage(json.errors));
    }
    return json;
  };
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { requestId, approve, reason } = req.body ?? {};
  const normalizedRequestId = String(requestId ?? '').trim();
  if (!normalizedRequestId || typeof approve !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  const hasura = makeHasuraClient();
  const appBase = String(process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
  const decisionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

  try {
    const actorScope = await getActorScope(hasura, actorId);
    const scopes = await getEffectiveScopes({ hasura, districtId: actorScope.districtId, schoolId: actorScope.schoolId });
    assertScope(scopes, 'messaging.enabled', true);

    const requestResp = await hasura(
      `query Request($id: uuid!, $actorId: uuid!) {
        request: messaging_requests_by_pk(id: $id) {
          id
          school_id
          district_id
          requester_user_id
          target_user_id
          status
          expires_at
        }
        actor: user_profiles_by_pk(user_id: $actorId) {
          role
          school_id
          district_id
        }
      }`,
      { id: normalizedRequestId, actorId }
    );

    const request = requestResp?.data?.request;
    const actorProfile = requestResp?.data?.actor;
    if (!request) return res.status(404).json({ ok: false, error: 'request_not_found' });

    const isTarget = request.target_user_id === actorId;
    const isAdmin = ADMIN_ROLES.has(String(actorProfile?.role ?? ''));
    const inSameSchool = actorProfile?.school_id && actorProfile.school_id === request.school_id;
    const inSameDistrict = actorProfile?.district_id && actorProfile.district_id === request.district_id;

    if (!isTarget && !(isAdmin && (inSameSchool || inSameDistrict || actorProfile?.role === 'admin' || actorProfile?.role === 'system_admin'))) {
      return res.status(403).json({ ok: false, error: 'not_allowed' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'already_decided' });
    }

    const nowIso = new Date().toISOString();
    const decisionStatus = approve ? 'approved' : 'denied';

    const updateResp = await hasura(
      `mutation Decide($id: uuid!, $status: String!, $now: timestamptz!, $actorId: uuid!, $reason: String) {
        update_messaging_requests_by_pk(
          pk_columns: { id: $id },
          _set: { status: $status, decided_at: $now, decided_by: $actorId, reason: $reason }
        ) {
          id
          school_id
          district_id
          requester_user_id
          target_user_id
          status
        }
      }`,
      { id: normalizedRequestId, status: decisionStatus, now: nowIso, actorId, reason: decisionReason }
    );

    const updated = updateResp?.data?.update_messaging_requests_by_pk;
    if (!updated?.id) return res.status(500).json({ ok: false, error: 'decision_failed' });

    let threadId: string | null = null;

    if (approve) {
      const threadResp = await hasura(
        `mutation UpsertThread($object: message_threads_insert_input!) {
          insert_message_threads_one(
            object: $object,
            on_conflict: {
              constraint: message_threads_school_requester_target_key,
              update_columns: [request_id, status, closed_at]
            }
          ) { id }
        }`,
        {
          object: {
            school_id: updated.school_id,
            district_id: updated.district_id,
            requester_user_id: updated.requester_user_id,
            target_user_id: updated.target_user_id,
            request_id: updated.id,
            status: 'active',
            closed_at: null,
          },
        }
      );

      threadId = threadResp?.data?.insert_message_threads_one?.id ?? null;

      await notifyUserEvent({
        hasura,
        userId: updated.requester_user_id,
        type: 'messaging.request_approved',
        title: 'Messaging request approved',
        body: 'Your messaging request was approved. You can now send messages.',
        severity: 'info',
        metadata: {
          requestId: updated.id,
          threadId,
          links: appBase ? { messages: `${appBase}/messages` } : {},
        },
        dedupeKey: `messaging.request_approved:${updated.id}`,
      });
    } else {
      await notifyUserEvent({
        hasura,
        userId: updated.requester_user_id,
        type: 'messaging.request_denied',
        title: 'Messaging request denied',
        body: decisionReason ? `Your messaging request was denied: ${decisionReason}` : 'Your messaging request was denied.',
        severity: 'warning',
        metadata: { requestId: updated.id },
        dedupeKey: `messaging.request_denied:${updated.id}`,
      });
    }

    return res.status(200).json({ ok: true, threadId });
  } catch (error: any) {
    logger.error('approve-messaging-request failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
