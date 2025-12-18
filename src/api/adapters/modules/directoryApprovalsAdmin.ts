import { graphql } from '@/lib/graphql';
import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;
type ApprovalResult = { ok?: boolean; approvalId?: string; status?: string; jobId?: string; previewId?: string };

const APPROVAL_FIELDS = `
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
`;

const APPROVAL_WITH_PREVIEW_FIELDS = `${APPROVAL_FIELDS}
  preview {
    id
    school_id
    district_id
    diff
    stats
    approval_id
    requires_approval
    applied_at
    expires_at
  }
`;

export async function listApprovals(params: { schoolId?: string; districtId?: string; status?: string; limit?: number } = {}) {
  const { schoolId, districtId, status = 'pending', limit = 50 } = params;
  const where: Record<string, unknown> = {};
  if (schoolId) where.school_id = { _eq: schoolId };
  if (districtId) where.district_id = { _eq: districtId };
  if (status) where.status = { _eq: status };

  const data = await graphql(
    `query Approvals($where: directory_deactivation_approvals_bool_exp, $limit: Int!) {
      directory_deactivation_approvals(where: $where, order_by: { requested_at: desc }, limit: $limit) {
        ${APPROVAL_FIELDS}
      }
    }`,
    { where, limit }
  );

  return data?.directory_deactivation_approvals ?? [];
}

export async function getApproval(approvalId: string) {
  const data = await graphql(
    `query Approval($id: uuid!) {
      directory_deactivation_approvals_by_pk(id: $id) {
        ${APPROVAL_WITH_PREVIEW_FIELDS}
      }
    }`,
    { id: approvalId }
  );

  return data?.directory_deactivation_approvals_by_pk;
}

export async function approve(approvalId: string, reason?: string) {
  const { res, error } = await nhost.functions.call('approve-deactivation-approval', { approvalId, reason });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<ApprovalResult>)?.data ?? (res as ApprovalResult);
  return payload;
}

export async function reject(approvalId: string, reason: string) {
  const { res, error } = await nhost.functions.call('reject-deactivation-approval', { approvalId, reason });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<ApprovalResult>)?.data ?? (res as ApprovalResult);
  return payload;
}

export async function apply(approvalId: string) {
  const { res, error } = await nhost.functions.call('apply-approved-preview', { approvalId });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<ApprovalResult>)?.data ?? (res as ApprovalResult);
  return payload;
}
