import type { Request, Response } from 'express';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage, type HasuraResponse } from '../_shared/hasuraTypes';
import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

const logger = createLogger('block-user-from-messaging');

type HasuraClient = <T>(query: string, variables?: Record<string, unknown>) => Promise<HasuraResponse<T>>;

function makeHasuraClient(): HasuraClient {
  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) {
    throw new Error('Missing Hasura configuration');
  }

  return async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await response.json()) as HasuraResponse<unknown>;
    if (json.errors && json.errors.length > 0) {
      logger.error('Hasura error', json.errors);
      throw new Error(getHasuraErrorMessage(json.errors));
    }
    return json;
  };
}

function isModeratorRole(role: string) {
  return ['admin', 'district_admin', 'school_admin', 'system_admin', 'teacher'].includes(String(role || '').toLowerCase());
}

export default async (req: Request, res: Response) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { schoolId, blockedUserId, reason } = req.body ?? {};
  const normalizedSchoolId = String(schoolId ?? '').trim();
  const normalizedBlockedUserId = String(blockedUserId ?? '').trim();
  const note = typeof reason === 'string' && reason.trim().length ? reason.trim() : null;

  if (!normalizedSchoolId || !normalizedBlockedUserId) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  const hasura = makeHasuraClient();
  const appBase = String(process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

  try {
    const actorScope = await getActorScope(hasura, actorId);
    if (!isModeratorRole(actorScope.role)) return res.status(403).json({ ok: false, error: 'not_allowed' });

    const scopes = await getEffectiveScopes({
      hasura,
      districtId: actorScope.districtId,
      schoolId: normalizedSchoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);

    const schoolResp = await hasura<{ school: { id: string; district_id?: string | null } | null }>(
      `query School($id: uuid!) {
        school: schools_by_pk(id: $id) { id district_id }
      }`,
      { id: normalizedSchoolId }
    );

    const school = schoolResp?.data?.school;
    if (!school?.id) return res.status(404).json({ ok: false, error: 'school_not_found' });

    const nowIso = new Date().toISOString();
    await hasura(
      `mutation Block($object: message_blocks_insert_input!, $schoolId: uuid!, $userId: uuid!, $now: timestamptz!, $status: String!) {
        insert_message_blocks_one(
          object: $object,
          on_conflict: { constraint: message_blocks_school_id_blocked_user_id_key, update_columns: [status, reason, blocked_by, lifted_at, lifted_by, created_at] }
        ) { id }
        update_message_threads(
          where: {
            school_id: { _eq: $schoolId },
            _or: [
              { requester_user_id: { _eq: $userId } },
              { target_user_id: { _eq: $userId } }
            ]
          },
          _set: { status: "closed", moderation_status: "blocked", closed_at: $now, closed_reason: "moderation" }
        ) { affected_rows }
      }`,
      {
        object: {
          school_id: normalizedSchoolId,
          district_id: school.district_id ?? null,
          blocked_user_id: normalizedBlockedUserId,
          blocked_by: actorId,
          reason: note,
          status: 'active',
        },
        schoolId: normalizedSchoolId,
        userId: normalizedBlockedUserId,
        now: nowIso,
        status: 'active',
      }
    );

    await notifyUserEvent({
      hasura,
      userId: normalizedBlockedUserId,
      type: 'messaging.user_blocked',
      title: 'Messaging access restricted',
      body: 'Your messaging access has been restricted by an administrator.',
      severity: 'warning',
      metadata: {
        schoolId: normalizedSchoolId,
        reason: note,
        links: appBase ? { messages: `${appBase}/messages` } : {},
      },
      dedupeKey: `messaging.user_blocked:${normalizedSchoolId}:${normalizedBlockedUserId}`,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('block-user-from-messaging failed', error);
    const message = error instanceof Error ? error.message : 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
