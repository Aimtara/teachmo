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
  if (!workflowId) return json(400, { ok: false, error: 'workflowId_required' });

  const scope = await getActorScope(
    (query, variables) => hasuraRequest({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, query, variables }),
    actorUserId
  );

  requireAction(scope.role, 'automation:request_review');

  const wf = await loadWorkflow({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, workflowId });
  if (!wf) return json(404, { ok: false, error: 'workflow_not_found' });

  if (!withinScope(scope, wf)) return json(403, { ok: false, error: 'forbidden' });

  const now = new Date().toISOString();

  await hasuraRequest({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    query: `mutation RequestReview($id: uuid!, $set: workflow_definitions_set_input!, $audit: workflow_publication_audits_insert_input!) {
      update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $set) { id status }
      insert_workflow_publication_audits_one(object: $audit) { id }
    }`,
    variables: {
      id: workflowId,
      set: {
        status: 'in_review',
        review_requested_at: now,
        review_requested_by: actorUserId,
      },
      audit: {
        workflow_id: workflowId,
        action: 'request_review',
        from_version: wf.version,
        to_version: wf.version,
        actor_user_id: actorUserId,
        metadata: { previous_status: wf.status, requested_at: now },
      },
    },
  });

  return json(200, { ok: true });
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
    console.error('[workflow-request-review] hasura error', resp.status, j?.errors || j);
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
