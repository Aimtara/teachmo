import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage } from '../_shared/hasuraTypes';

const logger = createLogger('lift-messaging-block');

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

function isModeratorRole(role: string) {
  return ['admin', 'district_admin', 'school_admin', 'system_admin', 'teacher'].includes(String(role || '').toLowerCase());
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { blockId } = req.body ?? {};
  const normalizedBlockId = String(blockId ?? '').trim();
  if (!normalizedBlockId) return res.status(400).json({ ok: false, error: 'missing_parameters' });

  const hasura = makeHasuraClient();

  try {
    const actorScope = await getActorScope(hasura, actorId);
    if (!isModeratorRole(actorScope.role)) return res.status(403).json({ ok: false, error: 'not_allowed' });

    const blockResp = await hasura(
      `query Block($id: uuid!) {
        block: message_blocks_by_pk(id: $id) {
          id
          school_id
          district_id
          status
        }
      }`,
      { id: normalizedBlockId }
    );

    const block = blockResp?.data?.block;
    if (!block?.id) return res.status(404).json({ ok: false, error: 'block_not_found' });

    const scopes = await getEffectiveScopes({
      hasura,
      districtId: block.district_id ?? actorScope.districtId,
      schoolId: block.school_id ?? actorScope.schoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);

    const nowIso = new Date().toISOString();
    await hasura(
      `mutation Lift($id: uuid!, $now: timestamptz!, $actor: uuid!) {
        update_message_blocks_by_pk(
          pk_columns: { id: $id },
          _set: { status: "lifted", lifted_at: $now, lifted_by: $actor }
        ) { id }
      }`,
      { id: block.id, now: nowIso, actor: actorId }
    );

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error('lift-messaging-block failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
