import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

const ALLOWED_REASONS = new Set(['harassment', 'spam', 'inappropriate', 'privacy', 'other']);

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

async function getAdminRecipients(hasura: any, schoolId: string, districtId: string | null) {
  const where = {
    _or: [
      { role: { _eq: 'admin' } },
      { role: { _eq: 'system_admin' } },
      { _and: [{ role: { _eq: 'school_admin' } }, { school_id: { _eq: schoolId } }] },
      districtId ? { _and: [{ role: { _eq: 'district_admin' } }, { district_id: { _eq: districtId } }] } : null,
    ].filter(Boolean),
  };

  const resp = await hasura(
    `query Admins($where: user_profiles_bool_exp!) {
      profiles: user_profiles(where: $where) { user_id }
    }`,
    { where }
  );

  const ids = Array.isArray(resp?.data?.profiles) ? resp.data.profiles.map((p: any) => p.user_id).filter(Boolean) : [];
  return [...new Set(ids)];
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const reporterId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!reporterId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { threadId, messageId, reason, detail } = req.body ?? {};
  const normalizedThreadId = String(threadId ?? '').trim();
  const normalizedMessageId = messageId ? String(messageId).trim() : null;
  const normalizedReason = String(reason ?? '').trim().toLowerCase();
  const detailText = typeof detail === 'string' && detail.trim().length ? detail.trim() : null;

  if (!normalizedThreadId || !ALLOWED_REASONS.has(normalizedReason)) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
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
          moderation_status
        }
      }`,
      { id: normalizedThreadId }
    );

    const thread = threadResp?.data?.thread;
    if (!thread?.id) return res.status(404).json({ ok: false, error: 'thread_not_found' });

    const actorScope = await getActorScope(hasura, reporterId);
    const scopes = await getEffectiveScopes({
      hasura,
      districtId: thread.district_id ?? actorScope.districtId,
      schoolId: thread.school_id ?? actorScope.schoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);

    const isParticipant = thread.requester_user_id === reporterId || thread.target_user_id === reporterId;
    if (!isParticipant) return res.status(403).json({ ok: false, error: 'not_allowed' });

    const messageCheck = normalizedMessageId
      ? await hasura(
          `query Message($id: uuid!, $threadId: uuid!) {
            message: messages_by_pk(id: $id) { id thread_id }
          }`,
          { id: normalizedMessageId, threadId: thread.id }
        )
      : null;

    if (normalizedMessageId && messageCheck?.data?.message?.thread_id !== thread.id) {
      return res.status(400).json({ ok: false, error: 'message_mismatch' });
    }

    const nowIso = new Date().toISOString();
    const reportResp = await hasura(
      `mutation Report($object: message_reports_insert_input!, $threadId: uuid!, $now: timestamptz!) {
        insert_message_reports_one(object: $object) { id }
        update_message_threads_by_pk(pk_columns: { id: $threadId }, _set: { moderation_status: "flagged", last_reported_at: $now }) { id }
      }`,
      {
        object: {
          school_id: thread.school_id,
          district_id: thread.district_id,
          reporter_user_id: reporterId,
          thread_id: thread.id,
          message_id: normalizedMessageId,
          reason: normalizedReason,
          detail: detailText,
          status: 'open',
          severity: 'medium',
          metadata: {},
        },
        threadId: thread.id,
        now: nowIso,
      }
    );

    const reportId = reportResp?.data?.insert_message_reports_one?.id;
    if (!reportId) return res.status(500).json({ ok: false, error: 'report_not_created' });

    const admins = await getAdminRecipients(hasura, thread.school_id, thread.district_id ?? null);
    const links = appBase ? { report: `${appBase}/admin/moderation/messages` } : {};
    await Promise.all(
      admins.map((userId: string) =>
        notifyUserEvent({
          hasura,
          userId,
          type: 'messaging.report_opened',
          title: 'New message report',
          body: 'A messaging report requires review.',
          severity: 'warning',
          metadata: { reportId, threadId: thread.id, links },
          dedupeKey: `messaging.report_opened:${reportId}:${userId}`,
        })
      )
    );

    return res.status(200).json({ ok: true, reportId });
  } catch (error: any) {
    console.error('report-message failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
