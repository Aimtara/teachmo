import type { Request, Response } from 'express';
import { createLogger } from '../_shared/logger';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

const logger = createLogger('list-message-blocks');

type HasuraResponse<T> = {
  data?: T;
  errors?: unknown;
};

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
    if (json.errors) {
      logger.error('Hasura error', json.errors);
      throw new Error(json.errors[0]?.message ?? 'hasura_error');
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

    const where: Record<string, unknown> = {};
    if (actorScope.schoolId) {
      where.school_id = { _eq: actorScope.schoolId };
    } else if (actorScope.districtId) {
      where.district_id = { _eq: actorScope.districtId };
    }

    const resp = await hasura<{ blocks?: unknown[] }>(
      `query Blocks($where: message_blocks_bool_exp) {
        blocks: message_blocks(where: $where, order_by: { created_at: desc }, limit: 100) {
          id
          school_id
          district_id
          blocked_user_id
          blocked_by
          reason
          status
          created_at
          lifted_at
          lifted_by
        }
      }`,
      { where }
    );

    return res.status(200).json({ ok: true, blocks: resp?.data?.blocks ?? [] });
  } catch (error) {
    logger.error('list-message-blocks failed', error);
    const message = error instanceof Error ? error.message : 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
