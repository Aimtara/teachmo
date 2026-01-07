import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';

const ALLOWED_STATUS = new Set(['triaged', 'resolved', 'dismissed']);
const ALLOWED_SEVERITY = new Set(['low', 'medium', 'high']);
const ALLOWED_ACTIONS = new Set(['none', 'close_thread', 'block_user', 'lift_block']);

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
    }
    return json;
  };
}

function isAdminRole(role: string) {
  return ['admin', 'district_admin', 'school_admin', 'system_admin', 'teacher'].includes(String(role || '').toLowerCase());
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const actorId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!actorId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { reportId, status, severity, adminNote, action, blockedUserId } = req.body ?? {};
  const normalizedReportId = String(reportId ?? '').trim();
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  const normalizedSeverity = String(severity ?? '').trim().toLowerCase();
  const normalizedAction = String(action ?? 'none').trim().toLowerCase();
  const normalizedBlockedUserId = blockedUserId ? String(blockedUserId).trim() : null;
  const note = typeof adminNote === 'string' && adminNote.trim().length ? adminNote.trim() : null;

  if (!normalizedReportId || !ALLOWED_STATUS.has(normalizedStatus) || !ALLOWED_SEVERITY.has(normalizedSeverity) || !ALLOWED_ACTIONS.has(normalizedAction)) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  const hasura = makeHasuraClient();

  try {
    const actorScope = await getActorScope(hasura, actorId);
    if (!isAdminRole(actorScope.role)) return res.status(403).json({ ok: false, error: 'not_allowed' });

    const reportResp = await hasura(
      `query Report($id: uuid!) {
        report: message_reports_by_pk(id: $id) {
          id
          school_id
          district_id
          reporter_user_id
          thread_id
          message_id
          status
          severity
          metadata
          triaged_at
          triaged_by
          resolved_at
          resolved_by
          thread {
            id
            school_id
            district_id
            requester_user_id
            target_user_id
            status
            moderation_status
          }
        }
      }`,
      { id: normalizedReportId }
    );

    const report = reportResp?.data?.report;
    if (!report?.id) return res.status(404).json({ ok: false, error: 'report_not_found' });

    const thread = report.thread;
    if (!thread?.id) return res.status(404).json({ ok: false, error: 'thread_not_found' });

    const scopes = await getEffectiveScopes({
      hasura,
      districtId: thread.district_id ?? actorScope.districtId,
      schoolId: thread.school_id ?? actorScope.schoolId,
    });
    assertScope(scopes, 'messaging.enabled', true);

    const nowIso = new Date().toISOString();
    const nextMetadata = { ...(report.metadata || {}), adminNote: note || undefined };
    const triagedAt = normalizedStatus === 'triaged' ? nowIso : report.triaged_at ?? null;
    const triagedBy = normalizedStatus === 'triaged' ? actorId : report.triaged_by ?? null;
    const resolvedAt = normalizedStatus === 'resolved' || normalizedStatus === 'dismissed' ? nowIso : report.resolved_at ?? null;
    const resolvedBy = normalizedStatus === 'resolved' || normalizedStatus === 'dismissed' ? actorId : report.resolved_by ?? null;

    const mutations: string[] = [];
    const variables: Record<string, any> = {
      reportId: report.id,
      status: normalizedStatus,
      severity: normalizedSeverity,
      now: nowIso,
      metadata: nextMetadata,
      actorId,
      threadId: thread.id,
    };

    mutations.push(`
      update_message_reports_by_pk(
        pk_columns: { id: $reportId },
        _set: {
          status: $status,
          severity: $severity,
          triaged_at: $triagedAt,
          triaged_by: $triagedBy,
          resolved_at: $resolvedAt,
          resolved_by: $resolvedBy,
          metadata: $metadata
        }
      ) { id }
    `);

    let newModerationStatus: string | null = null;
    let threadStatusUpdate: string | null = null;

    if (normalizedAction === 'close_thread') {
      newModerationStatus = 'closed';
      threadStatusUpdate = 'closed';
    } else if (normalizedAction === 'block_user') {
      newModerationStatus = 'blocked';
    } else if (normalizedStatus === 'resolved' || normalizedStatus === 'dismissed') {
      newModerationStatus = 'ok';
    }

    if (normalizedAction === 'block_user' && normalizedBlockedUserId) {
      mutations.push(`
        insert_message_blocks_one(
          object: {
            school_id: ${thread.school_id ? '$threadSchoolId' : 'NULL'},
            district_id: ${thread.district_id ? '$threadDistrictId' : 'NULL'},
            blocked_user_id: $blockedUserId,
            blocked_by: $actorId,
            reason: $adminNote,
            status: "active"
          },
          on_conflict: { constraint: message_blocks_school_id_blocked_user_id_key, update_columns: [status, reason, blocked_by, created_at] }
        ) { id }
      `);
      variables.threadSchoolId = thread.school_id;
      variables.threadDistrictId = thread.district_id ?? null;
      variables.blockedUserId = normalizedBlockedUserId;
      variables.adminNote = note;
    }

    if (normalizedAction === 'lift_block' && normalizedBlockedUserId) {
      mutations.push(`
        update_message_blocks(
          where: { school_id: { _eq: $threadSchoolId }, blocked_user_id: { _eq: $blockedUserId }, status: { _eq: "active" } },
          _set: { status: "lifted", lifted_at: $now, lifted_by: $actorId }
        ) { affected_rows }
      `);
      variables.threadSchoolId = thread.school_id;
      variables.blockedUserId = normalizedBlockedUserId;
    }

    if (newModerationStatus || threadStatusUpdate) {
      const setParts = [];
      if (newModerationStatus) setParts.push(`moderation_status: "${newModerationStatus}"`);
      if (threadStatusUpdate) setParts.push(`status: "${threadStatusUpdate}"`);
      if (threadStatusUpdate === 'closed') {
        setParts.push('closed_at: $now');
        setParts.push('closed_reason: "moderation"');
      }
      mutations.push(`
        update_message_threads_by_pk(
          pk_columns: { id: $threadId },
          _set: { ${setParts.join(', ')} }
        ) { id }
      `);
    }

    variables.triagedAt = triagedAt;
    variables.triagedBy = triagedBy;
    variables.resolvedAt = resolvedAt;
    variables.resolvedBy = resolvedBy;

    const mutation = `mutation Triage($reportId: uuid!, $status: String!, $severity: String!, $now: timestamptz!, $metadata: jsonb!, $actorId: uuid!, $threadId: uuid!, $triagedAt: timestamptz, $triagedBy: uuid, $resolvedAt: timestamptz, $resolvedBy: uuid${
      variables.threadSchoolId ? ', $threadSchoolId: uuid!' : ''
    }${variables.threadDistrictId ? ', $threadDistrictId: uuid' : ''}${variables.blockedUserId ? ', $blockedUserId: uuid!' : ''}${variables.adminNote ? ', $adminNote: String' : ''}) {
      ${mutations.join('\n')}
    }`;

    await hasura(mutation, variables);

    if (report.reporter_user_id) {
      await notifyUserEvent({
        hasura,
        userId: report.reporter_user_id,
        type: 'messaging.report_update',
        title: 'Your report was updated',
        body: `Status: ${normalizedStatus} (severity ${normalizedSeverity}).`,
        severity: normalizedSeverity === 'high' ? 'critical' : 'info',
        metadata: { reportId: report.id, threadId: thread.id },
        dedupeKey: `messaging.report_update:${report.id}:${normalizedStatus}`,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('triage-message-report failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
