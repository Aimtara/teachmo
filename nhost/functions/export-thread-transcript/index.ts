import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage } from '../_shared/hasuraTypes';

const logger = createLogger('export-thread-transcript');

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

  const { threadId } = req.body ?? {};
  const normalizedThreadId = String(threadId ?? '').trim();
  if (!normalizedThreadId) return res.status(400).json({ ok: false, error: 'missing_parameters' });

  const hasura = makeHasuraClient();

  try {
    const threadResp = await hasura(
      `query Thread($id: uuid!) {
        thread: message_threads_by_pk(id: $id) {
          id
          school_id
          district_id
          requester_user_id
          target_user_id
          status
          moderation_status
          created_at
          closed_at
          last_message_preview
          messages(order_by: { created_at: asc }) {
            id
            sender_user_id
            created_at
            body
            flagged
            flag_reason
          }
        }
      }`,
      { id: normalizedThreadId }
    );

    const thread = threadResp?.data?.thread;
    if (!thread?.id) return res.status(404).json({ ok: false, error: 'thread_not_found' });

    const actorScope = await getActorScope(hasura, actorId);
    const scopes = await getEffectiveScopes({
      hasura,
      districtId: thread.district_id ?? actorScope.districtId,
      schoolId: thread.school_id ?? actorScope.schoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);
    assertScope(scopes, 'messaging.transcriptExport', true);

    await hasura(
      `mutation Audit($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: actorId,
          action: 'messaging.transcript_exported',
          entity_type: 'message_thread',
          entity_id: thread.id,
          metadata: { exported_at: new Date().toISOString() },
        },
      }
    );

    return res.status(200).json({
      ok: true,
      thread: {
        id: thread.id,
        school_id: thread.school_id,
        district_id: thread.district_id,
        requester_user_id: thread.requester_user_id,
        target_user_id: thread.target_user_id,
        status: thread.status,
        moderation_status: thread.moderation_status,
        created_at: thread.created_at,
        closed_at: thread.closed_at,
        last_message_preview: thread.last_message_preview,
      },
      messages: thread.messages || [],
    });
  } catch (error: any) {
    logger.error('export-thread-transcript failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
