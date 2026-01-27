import type { Request, Response } from 'express';
import { createLogger } from '../_shared/logger';
import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';
import type { HasuraClient, HasuraResponse } from '../_shared/hasuraTypes';

const logger = createLogger('send-message');

const RATE_WINDOWS = [
  { windowSeconds: 60, limit: 10 },
  { windowSeconds: 86400, limit: 100 },
];

const PROFANITY_LIST = String(process.env.SAFETY_PROFANITY_LIST ?? '')
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

const LINK_FLAG_THRESHOLD = Number(process.env.SAFETY_LINK_FLAG_THRESHOLD ?? 3);
const BURST_FLAG_THRESHOLD = Number(process.env.SAFETY_BURST_FLAG_THRESHOLD ?? 8);

function windowStart(seconds: number): string {
  const now = Date.now();
  const windowMs = seconds * 1000;
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

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
      throw new Error(json.errors[0].message ?? 'hasura_error');
    }
    return json;
  };
}

async function checkRateLimits(hasura: HasuraClient, baseKey: string) {
  for (const entry of RATE_WINDOWS) {
    const start = windowStart(entry.windowSeconds);
    const rateKey = `${baseKey}:window:${entry.windowSeconds}`;
    const rateResp = await hasura<{ rate: { count?: number; window_start?: string; window_seconds?: number } | null }>(
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

export default async (req: Request, res: Response) => {
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
    const threadResp = await hasura<{
      thread: {
        id: string;
        school_id?: string | null;
        district_id?: string | null;
        requester_user_id?: string | null;
        target_user_id?: string | null;
        status?: string | null;
        moderation_status?: string | null;
        request?: { id?: string | null; status?: string | null } | null;
      } | null;
    }>(
      `query Thread($id: uuid!) {
        thread: message_threads_by_pk(id: $id) {
          id
          school_id
          district_id
          requester_user_id
          target_user_id
          status
          moderation_status
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

    if (thread.moderation_status && ['blocked', 'closed'].includes(thread.moderation_status)) {
      return res.status(403).json({ ok: false, error: 'thread_moderated' });
    }

    if (thread.request && thread.request.status && thread.request.status !== 'approved') {
      return res.status(403).json({ ok: false, error: 'request_not_approved' });
    }

    const otherUserId = thread.requester_user_id === actorId ? thread.target_user_id : thread.requester_user_id;
    const blocksResp = await hasura<{ blocks: { id: string; blocked_user_id?: string | null }[] }>(
      `query Blocks($schoolId: uuid!, $actorId: uuid!, $otherId: uuid!) {
        blocks: message_blocks(
          where: {
            school_id: { _eq: $schoolId },
            status: { _eq: "active" },
            blocked_user_id: { _in: [$actorId, $otherId] }
          },
          limit: 1
        ) {
          id
          blocked_user_id
        }
      }`,
      { schoolId: thread.school_id, actorId, otherId: otherUserId }
    );

    if (blocksResp?.data?.blocks?.length) {
      const blockedEntry = blocksResp.data.blocks[0];
      const isActorBlocked = blockedEntry?.blocked_user_id === actorId;
      return res.status(403).json({ ok: false, error: isActorBlocked ? 'blocked_sender' : 'blocked_recipient' });
    }

    const rateCheck = await checkRateLimits(hasura, `msg:${thread.id}:${actorId}`);
    if (!rateCheck.allowed) {
      return res.status(429).json({ ok: false, error: 'rate_limited', window: rateCheck.window });
    }

    const preview = messageBody.length > 240 ? `${messageBody.slice(0, 240)}…` : messageBody;
    const nowIso = new Date().toISOString();

    // Lightweight safety checks
    const urlCount = (messageBody.match(/https?:\\/\\/[^\\s]+/gi) || []).length;
    const containsProfanity = PROFANITY_LIST.some((word) => word && messageBody.toLowerCase().includes(word));
    let flaggedReason: string | null = null;
    if (LINK_FLAG_THRESHOLD > 0 && urlCount >= LINK_FLAG_THRESHOLD) {
      flaggedReason = 'link_spam';
    } else if (containsProfanity) {
      flaggedReason = 'language';
    }

    if (!flaggedReason && BURST_FLAG_THRESHOLD > 0) {
      const burstSince = new Date(Date.now() - 30_000).toISOString();
      const burstResp = await hasura<{ messages_aggregate?: { aggregate?: { count?: number } | null } | null }>(
        `query Burst($threadId: uuid!, $senderId: uuid!, $since: timestamptz!) {
          messages_aggregate(where: { thread_id: { _eq: $threadId }, sender_user_id: { _eq: $senderId }, created_at: { _gte: $since } }) {
            aggregate { count }
          }
        }`,
        { threadId: thread.id, senderId: actorId, since: burstSince }
      );
      const burstCount = Number(burstResp?.data?.messages_aggregate?.aggregate?.count ?? 0);
      if (burstCount >= BURST_FLAG_THRESHOLD) {
        flaggedReason = 'rate_limit_spike';
      }
    }

    const insertResp = await hasura<{
      insert_messages_one?: { id?: string | null; thread_id?: string | null; created_at?: string | null } | null;
      update_message_threads_by_pk?: { id?: string | null } | null;
    }>(
      `mutation SendMessage($object: messages_insert_input!, $threadId: uuid!, $preview: String, $now: timestamptz!, $flagged: Boolean!, $flagReason: String) {
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
          flagged: Boolean(flaggedReason),
          flag_reason: flaggedReason,
        },
        threadId: thread.id,
        preview,
        now: nowIso,
        flagged: Boolean(flaggedReason),
        flagReason: flaggedReason,
      }
    );

    const message = insertResp?.data?.insert_messages_one;
    if (!message?.id) return res.status(500).json({ ok: false, error: 'message_not_created' });

    // Telemetry: message sent
    try {
      await hasura(
        `mutation TrackMessageSent($object: analytics_events_insert_input!) {
          insert_analytics_events_one(object: $object) { id }
        }`,
        {
          object: {
            event_name: 'messaging.message_sent',
            actor_user_id: actorId,
            district_id: thread.district_id,
            school_id: thread.school_id,
            entity_type: 'message',
            entity_id: message.id,
            metadata: {
              thread_id: thread.id,
              preview,
              flagged: Boolean(flaggedReason),
              flag_reason: flaggedReason || null,
              recipient_user_id: otherUserId || null,
              source: 'send-message',
            },
          },
        }
      );
    } catch (e) {
      logger.warn('telemetry insert failed', e);
    }

    if (flaggedReason) {
      await hasura(
        `mutation AutoReport($object: message_reports_insert_input!, $threadId: uuid!, $now: timestamptz!) {
          insert_message_reports_one(object: $object) { id }
          update_message_threads_by_pk(pk_columns: { id: $threadId }, _set: { moderation_status: "flagged", last_reported_at: $now }) { id }
        }`,
        {
          object: {
            school_id: thread.school_id,
            district_id: thread.district_id,
            reporter_user_id: actorId,
            thread_id: thread.id,
            message_id: message.id,
            reason: flaggedReason,
            detail: 'Automatic safety flag',
            status: 'open',
            severity: 'low',
            metadata: { automatic: true, flag_reason: flaggedReason },
          },
          threadId: thread.id,
          now: nowIso,
        }
      );
    }

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

    await hasura(
      `mutation LogAnalytics($object: analytics_events_insert_input!) {\n        insert_analytics_events_one(object: $object) { id }\n      }`,
      {
        object: {
          event_name: 'message_sent',
          event_ts: nowIso,
          organization_id: thread.district_id ?? actorScope.districtId,
          school_id: thread.school_id ?? actorScope.schoolId,
          actor_id: actorId,
          actor_role: actorScope.role || null,
          metadata: { thread_id: thread.id, message_id: message.id },
          source: 'function',
        },
      }
    );

    return res.status(200).json({ ok: true, messageId: message.id });
  } catch (error) {
    logger.error('send-message failed', error);
    const message = error instanceof Error ? error.message : 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
