import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

const RATE_WINDOWS = [
  { windowSeconds: 60, limit: 10 },
  { windowSeconds: 86400, limit: 100 },
];

function windowStart(seconds: number): string {
  const now = Date.now();
  const windowMs = seconds * 1000;
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

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

async function checkRateLimits(hasura: any, baseKey: string) {
  for (const entry of RATE_WINDOWS) {
    const start = windowStart(entry.windowSeconds);
    const rateKey = `${baseKey}:window:${entry.windowSeconds}`;
    const rateResp = await hasura(
      `query Rate($key: String!) {
        rate: rate_limits_by_pk(key: $key) {
          key
          count
          window_start
          window_seconds
        }
      }`,
      { key: rateKey }
    );

    const existing = rateResp?.data?.rate;
    const sameWindow = existing?.window_start && existing.window_start === start && existing.window_seconds === entry.windowSeconds;
    const nextCount = sameWindow ? Number(existing.count ?? 0) + 1 : 1;

    if (nextCount > entry.limit) {
      return { allowed: false, window: entry, count: nextCount };
    }

    await hasura(
      `mutation UpsertRate($object: rate_limits_insert_input!) {
        insert_rate_limits_one(
          object: $object,
          on_conflict: { constraint: rate_limits_pkey, update_columns: [count, window_start, window_seconds, updated_at] }
        ) { key }
      }`,
      {
        object: {
          key: rateKey,
          count: nextCount,
          window_start: start,
          window_seconds: entry.windowSeconds,
          updated_at: new Date().toISOString(),
        },
      }
    );
  }

  return { allowed: true };
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { threadId, body } = req.body ?? {};
  const normalizedThreadId = String(threadId ?? '').trim();
  const messageBody = typeof body === 'string' ? body.trim() : '';

  if (!normalizedThreadId || !messageBody) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  if (messageBody.length > 5000) {
    return res.status(400).json({ ok: false, error: 'message_too_long' });
  }

  const hasura = makeHasuraClient();
  const appBase = String(process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

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
          request { id status }
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

    const isParticipant = thread.requester_user_id === actorId || thread.target_user_id === actorId;
    if (!isParticipant) return res.status(403).json({ ok: false, error: 'not_allowed' });

    if (thread.status && thread.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'thread_inactive' });
    }

    if (thread.request && thread.request.status && thread.request.status !== 'approved') {
      return res.status(403).json({ ok: false, error: 'request_not_approved' });
    }

    const otherUserId = thread.requester_user_id === actorId ? thread.target_user_id : thread.requester_user_id;
    const blocksResp = await hasura(
      `query Blocks($schoolId: uuid!, $actorId: uuid!, $otherId: uuid!) {
        blocks: message_blocks(
          where: {
            school_id: { _eq: $schoolId },
            _or: [
              { _and: [{ blocker_user_id: { _eq: $otherId } }, { blocked_user_id: { _eq: $actorId } }] },
              { _and: [{ blocker_user_id: { _eq: $actorId } }, { blocked_user_id: { _eq: $otherId } }] }
            ]
          },
          limit: 1
        ) {
          id
        }
      }`,
      { schoolId: thread.school_id, actorId, otherId: otherUserId }
    );

    if (blocksResp?.data?.blocks?.length) {
      return res.status(403).json({ ok: false, error: 'blocked' });
    }

    const rateCheck = await checkRateLimits(hasura, `msg:${thread.id}:${actorId}`);
    if (!rateCheck.allowed) {
      return res.status(429).json({ ok: false, error: 'rate_limited', window: rateCheck.window });
    }

    const preview = messageBody.length > 240 ? `${messageBody.slice(0, 240)}…` : messageBody;
    const nowIso = new Date().toISOString();

    const insertResp = await hasura(
      `mutation SendMessage($object: messages_insert_input!, $threadId: uuid!, $preview: String, $now: timestamptz!) {
        insert_messages_one(object: $object) { id thread_id created_at }
        update_message_threads_by_pk(pk_columns: { id: $threadId }, _set: { last_message_preview: $preview, updated_at: $now }) {
          id
        }
      }`,
      {
        object: {
          thread_id: thread.id,
          sender_id: actorId,
          sender_user_id: actorId,
          body: messageBody,
        },
        threadId: thread.id,
        preview,
        now: nowIso,
      }
    );

    const message = insertResp?.data?.insert_messages_one;
    if (!message?.id) return res.status(500).json({ ok: false, error: 'message_not_created' });

    if (otherUserId) {
      await notifyUserEvent({
        hasura,
        userId: otherUserId,
        type: 'messaging.new_message',
        title: 'New message',
        body: 'You have a new message waiting.',
        severity: 'info',
        metadata: {
          threadId: thread.id,
          messageId: message.id,
          links: appBase ? { thread: `${appBase}/messages` } : {},
        },
        dedupeKey: `messaging.new_message:${thread.id}:${otherUserId}`,
      });
    }

    return res.status(200).json({ ok: true, messageId: message.id });
  } catch (error: any) {
    console.error('send-message failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
