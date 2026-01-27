import { HasuraClient } from './directoryImportCore';
import { getActorScope } from './tenantScope';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'expired' | 'cancelled';

type ApprovalRecord = {
  id: string;
  preview_id: string;
  source_id?: string | null;
  source_run_id?: string | null;
  school_id: string;
  district_id?: string | null;
  status: ApprovalStatus;
  requested_by: string;
  requested_at?: string;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_reason?: string | null;
  applied_at?: string | null;
  expires_at?: string | null;
  stats?: Record<string, any>;
  metadata?: Record<string, any>;
};

function toIsoDate(value?: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

export async function isTenantAdminForScope(params: {
  hasura: HasuraClient;
  actorId: string;
  schoolId?: string | null;
  districtId?: string | null;
}) {
  const { hasura, actorId, schoolId = null, districtId = null } = params;
  const scope = await getActorScope(hasura, actorId);
  const role = scope.role;

  if (role === 'admin' || role === 'system_admin') return true;

  if (role === 'district_admin') {
    if (districtId && scope.districtId && districtId !== scope.districtId) return false;
    return Boolean(scope.districtId);
  }

  if (role === 'school_admin') {
    if (schoolId && scope.schoolId && schoolId !== scope.schoolId) return false;
    return Boolean(scope.schoolId);
  }

  return false;
}

export async function findPendingApproval(params: {
  hasura: HasuraClient;
  sourceId?: string | null;
  schoolId: string;
  districtId?: string | null;
  dedupeSince?: string | null;
}) {
  const { hasura, sourceId = null, schoolId, districtId = null, dedupeSince = null } = params;

  const where: Record<string, any> = {
    status: { _eq: 'pending' },
    school_id: { _eq: schoolId },
  };

  if (sourceId) where.source_id = { _eq: sourceId };
  if (districtId) where.district_id = { _eq: districtId };
  if (dedupeSince) where.requested_at = { _gte: dedupeSince };

  const resp = await hasura(
    `query PendingApproval($where: directory_deactivation_approvals_bool_exp!) {
      directory_deactivation_approvals(where: $where, order_by: { requested_at: desc }, limit: 1) {
        id
        preview_id
        source_id
        source_run_id
        school_id
        district_id
        status
        requested_at
        expires_at
        stats
      }
    }`,
    { where }
  );

  const list = Array.isArray(resp?.data?.directory_deactivation_approvals)
    ? resp.data.directory_deactivation_approvals
    : [];

  return list[0] as ApprovalRecord | undefined;
}

export async function loadApproval(hasura: HasuraClient, id: string): Promise<ApprovalRecord | null> {
  const resp = await hasura(
    `query Approval($id: uuid!) {
      directory_deactivation_approvals_by_pk(id: $id) {
        id
        preview_id
        source_id
        source_run_id
        school_id
        district_id
        status
        requested_by
        requested_at
        decided_by
        decided_at
        decision_reason
        applied_at
        expires_at
        stats
        metadata
      }
    }`,
    { id }
  );

  return (resp?.data?.directory_deactivation_approvals_by_pk as ApprovalRecord) ?? null;
}

export function isApprovalExpired(approval?: { expires_at?: string | null }) {
  if (!approval?.expires_at) return false;
  const expires = new Date(approval.expires_at);
  return expires.getTime() < Date.now();
}

export async function createDeactivationApproval(params: {
  hasura: HasuraClient;
  previewId: string;
  schoolId: string;
  districtId?: string | null;
  requestedBy: string;
  stats: Record<string, any>;
  sourceId?: string | null;
  sourceRunId?: string | null;
  metadata?: Record<string, any>;
  expiresAt?: string | null;
}) {
  const {
    hasura,
    previewId,
    schoolId,
    districtId = null,
    requestedBy,
    stats = {},
    sourceId = null,
    sourceRunId = null,
    metadata = {},
    expiresAt = null,
  } = params;

  const expires = toIsoDate(expiresAt);

  const insertResp = await hasura(
    `mutation InsertApproval($object: directory_deactivation_approvals_insert_input!) {
      insert_directory_deactivation_approvals_one(object: $object) {
        id
        status
        preview_id
        requested_at
        expires_at
        stats
      }
    }`,
    {
      object: {
        preview_id: previewId,
        source_id: sourceId,
        source_run_id: sourceRunId,
        school_id: schoolId,
        district_id: districtId,
        requested_by: requestedBy,
        expires_at: expires,
        stats,
        metadata,
      },
    }
  );

  return insertResp?.data?.insert_directory_deactivation_approvals_one as ApprovalRecord;
}

export async function setApprovalStatus(params: {
  hasura: HasuraClient;
  id: string;
  status: ApprovalStatus;
  decidedBy?: string | null;
  reason?: string | null;
  appliedAt?: string | null;
}) {
  const { hasura, id, status, decidedBy = null, reason = null, appliedAt = undefined } = params;
  const decidedAt = decidedBy ? new Date().toISOString() : null;

  const setInput: Record<string, any> = {
    status,
  };

  if (decidedBy !== undefined) {
    setInput.decided_by = decidedBy;
    setInput.decided_at = decidedAt;
    setInput.decision_reason = reason;
  }

  if (appliedAt !== undefined) {
    setInput.applied_at = appliedAt;
  }

  const resp = await hasura(
    `mutation UpdateApproval($id: uuid!, $set: directory_deactivation_approvals_set_input!) {
      update_directory_deactivation_approvals_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        status
        decided_by
        decided_at
        decision_reason
        applied_at
      }
    }`,
    { id, set: setInput }
  );

  return resp?.data?.update_directory_deactivation_approvals_by_pk as ApprovalRecord;
}

export async function upsertApprovalRequest(params: {
  hasura: HasuraClient;
  previewId: string;
  schoolId: string;
  districtId?: string | null;
  requestedBy: string;
  stats: Record<string, any>;
  sourceId?: string | null;
  sourceRunId?: string | null;
  metadata?: Record<string, any>;
  dedupeSince?: string | null;
  expiresAt?: string | null;
  existingApprovalId?: string | null;
}) {
  const {
    hasura,
    previewId,
    schoolId,
    districtId = null,
    requestedBy,
    stats = {},
    sourceId = null,
    sourceRunId = null,
    metadata = {},
    dedupeSince = null,
    expiresAt = null,
    existingApprovalId = null,
  } = params;

  const nowIso = new Date().toISOString();
  const expires = toIsoDate(expiresAt);

  let approval: ApprovalRecord | null = null;
  if (existingApprovalId) {
    approval = await loadApproval(hasura, existingApprovalId);
  }

  if (!approval || approval.status !== 'pending' || isApprovalExpired(approval)) {
    const pending = await findPendingApproval({ hasura, sourceId, schoolId, districtId, dedupeSince });
    if (pending && pending.status === 'pending' && !isApprovalExpired(pending)) {
      approval = pending;
    }
  }

  if (approval && approval.status === 'pending' && !isApprovalExpired(approval)) {
    const updateResp = await hasura(
      `mutation RefreshApproval($id: uuid!, $set: directory_deactivation_approvals_set_input!) {
        update_directory_deactivation_approvals_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          status
          preview_id
          requested_at
          expires_at
          stats
        }
      }`,
      {
        id: approval.id,
        set: {
          preview_id: previewId,
          source_id: sourceId,
          source_run_id: sourceRunId,
          stats,
          metadata,
          requested_at: nowIso,
          expires_at: expires ?? approval.expires_at,
        },
      }
    );

    approval = updateResp?.data?.update_directory_deactivation_approvals_by_pk as ApprovalRecord;
  } else {
    approval = await createDeactivationApproval({
      hasura,
      previewId,
      schoolId,
      districtId,
      requestedBy,
      stats,
      sourceId,
      sourceRunId,
      metadata,
      expiresAt: expires ?? undefined,
    });
  }

  if (approval?.id) {
    await hasura(
      `mutation FlagPreview($id: uuid!, $approvalId: uuid!) {
        update_directory_import_previews_by_pk(
          pk_columns: { id: $id },
          _set: { requires_approval: true, approval_id: $approvalId }
        ) { id }
      }`,
      { id: previewId, approvalId: approval.id }
    );
  }

  return approval;
}
