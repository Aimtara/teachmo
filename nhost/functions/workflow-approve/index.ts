import { getActorScope } from '../_shared/tenantScope';
import { requireAction } from '../_shared/rbac';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) {
    return json(500, { ok: false, error: 'missing_hasura_config' });
  }

  const actorUserId = req.headers.get('x-nhost-user-id') || req.headers.get('x-hasura-user-id');
  if (!actorUserId) return json(401, { ok: false, error: 'unauthorized' });

  const body = (await safeJson(req)) as any;
  const workflowId = typeof body?.workflowId === 'string' ? body.workflowId.trim() : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
  if (!workflowId) return json(400, { ok: false, error: 'workflowId_required' });

  const scope = await getActorScope(
    (query, variables) => hasuraRequest({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, query, variables }),
    actorUserId
  );

  requireAction(scope.role, 'automation:approve');

  const wf = await loadWorkflow({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, workflowId });
  if (!wf) return json(404, { ok: false, error: 'workflow_not_found' });

  if (!withinScope(scope, wf)) return json(403, { ok: false, error: 'forbidden' });

  const now = new Date().toISOString();

  // Insert an approval record (idempotent per approver via unique constraint).
  await upsertApproval({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    workflowId,
    version: wf.version,
    approverUserId: actorUserId,
    reason,
  });

  const approvalsCount = await countApprovals({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    workflowId,
    version: wf.version,
  });

  const minApprovals = await getMinApprovalsForTenant({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    districtId: wf.district_id ?? scope.districtId ?? null,
    schoolId: wf.school_id ?? scope.schoolId ?? null,
  });

  const meetsThreshold = approvalsCount >= minApprovals;

  await hasuraRequest({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    query: `mutation Approve($id: uuid!, $set: workflow_definitions_set_input!, $audit: workflow_publication_audits_insert_input!) {
      update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $set) { id status }
      insert_workflow_publication_audits_one(object: $audit) { id }
    }`,
    variables: {
      id: workflowId,
      set: meetsThreshold
        ? {
            status: 'approved',
            approved_at: now,
            approved_by: actorUserId,
          }
        : {
            // Keep it in_review until the threshold is reached.
            status: wf.status === 'draft' ? 'in_review' : wf.status,
          },
      audit: {
        workflow_id: workflowId,
        action: 'approve',
        from_version: wf.version,
        to_version: wf.version,
        actor_user_id: actorUserId,
        metadata: {
          previous_status: wf.status,
          approved_at: now,
          approvals_count: approvalsCount,
          min_approvals: minApprovals,
          threshold_reached: meetsThreshold,
          reason,
        },
      },
    },
  });

  return json(200, { ok: true, approvalsCount, minApprovals, thresholdReached: meetsThreshold });
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function hasuraRequest(args: { hasuraUrl: string; adminSecret: string; query: string; variables?: any }) {
  const resp = await fetch(args.hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': args.adminSecret,
    },
    body: JSON.stringify({ query: args.query, variables: args.variables || {} }),
  });
  const j = await resp.json();
  if (!resp.ok || j?.errors?.length) {
    console.error('[workflow-approve] hasura error', resp.status, j?.errors || j);
    throw new Error(j?.errors?.[0]?.message || 'hasura_error');
  }
  return j.data;
}

async function loadWorkflow(args: { hasuraUrl: string; adminSecret: string; workflowId: string }) {
  const q = `query Wf($id: uuid!) {
    workflow_definitions_by_pk(id: $id) { id status version district_id school_id }
  }`;
  const data = await hasuraRequest({ hasuraUrl: args.hasuraUrl, adminSecret: args.adminSecret, query: q, variables: { id: args.workflowId } });
  return data?.workflow_definitions_by_pk as any;
}

function withinScope(scope: { role: string; districtId?: string | null; schoolId?: string | null }, wf: any): boolean {
  if (scope.role === 'admin' || scope.role === 'system_admin') return true;
  if (scope.role === 'district_admin') {
    return Boolean(scope.districtId) && (!wf.district_id || wf.district_id === scope.districtId);
  }
  if (scope.role === 'school_admin') {
    return Boolean(scope.schoolId) && (!wf.school_id || wf.school_id === scope.schoolId);
  }
  return false;
}

async function upsertApproval(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  version: number;
  approverUserId: string;
  reason: string | null;
}) {
  // If it exists already, do nothing (idempotent).
  const existsQ = `query Exists($workflowId: uuid!, $version: Int!, $userId: uuid!) {
    workflow_approvals(where: { workflow_id: { _eq: $workflowId }, version: { _eq: $version }, approver_user_id: { _eq: $userId } }, limit: 1) { id }
  }`;
  const exists = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: existsQ,
    variables: { workflowId: args.workflowId, version: args.version, userId: args.approverUserId },
  });
  if ((exists?.workflow_approvals || []).length) return;

  const insertQ = `mutation Insert($obj: workflow_approvals_insert_input!) {
    insert_workflow_approvals_one(object: $obj) { id }
  }`;

  await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: insertQ,
    variables: {
      obj: {
        workflow_id: args.workflowId,
        version: args.version,
        approver_user_id: args.approverUserId,
        reason: args.reason,
        metadata: {},
      },
    },
  });
}

async function countApprovals(args: { hasuraUrl: string; adminSecret: string; workflowId: string; version: number }): Promise<number> {
  const q = `query Count($workflowId: uuid!, $version: Int!) {
    workflow_approvals_aggregate(where: { workflow_id: { _eq: $workflowId }, version: { _eq: $version } }) {
      aggregate { count }
    }
  }`;
  const data = await hasuraRequest({ hasuraUrl: args.hasuraUrl, adminSecret: args.adminSecret, query: q, variables: { workflowId: args.workflowId, version: args.version } });
  return Number(data?.workflow_approvals_aggregate?.aggregate?.count || 0);
}

async function getMinApprovalsForTenant(args: {
  hasuraUrl: string;
  adminSecret: string;
  districtId: string | null;
  schoolId: string | null;
}): Promise<number> {
  // Default is single-approval (backwards compatible).
  const fallback = 1;

  const readQ = `query Settings($districtId: uuid, $schoolId: uuid) {
    tenant_settings(
      where: {
        _or: [
          { school_id: { _eq: $schoolId } }
          { _and: [ { district_id: { _eq: $districtId } }, { school_id: { _is_null: true } } ] }
        ]
      }
      limit: 5
    ) {
      district_id
      school_id
      settings
    }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: readQ,
    variables: { districtId: args.districtId, schoolId: args.schoolId },
  });

  const rows = (data?.tenant_settings || []) as any[];
  const best = rows.find((r) => args.schoolId && r.school_id === args.schoolId) || rows.find((r) => args.districtId && r.district_id === args.districtId) || null;
  const settings = best?.settings || {};

  const v1 = Number(settings?.workflow_min_approvals);
  if (Number.isFinite(v1) && v1 >= 1) return Math.min(5, Math.floor(v1));

  const v2 = Number(settings?.workflow?.min_approvals);
  if (Number.isFinite(v2) && v2 >= 1) return Math.min(5, Math.floor(v2));

  return fallback;
}
