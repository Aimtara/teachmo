import { getActorScope } from '../_shared/tenantScope';
import { requireAction } from '../_shared/rbac';
import { signWorkflowVersion } from '../_shared/workflowSigning';

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

  requireAction(scope.role, 'automation:publish');

  const wf = await loadWorkflow({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, workflowId });
  if (!wf) return json(404, { ok: false, error: 'workflow_not_found' });

  if (!withinScope(scope, wf)) return json(403, { ok: false, error: 'forbidden' });

  // Governance: require approval (unless system_admin/admin). Approval threshold is tenant-configurable.
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

  if (!['admin', 'system_admin'].includes(String(scope.role))) {
    if (wf.status !== 'approved') {
      return json(409, { ok: false, error: 'workflow_not_approved', status: wf.status });
    }
    if (approvalsCount < minApprovals) {
      return json(409, { ok: false, error: 'insufficient_approvals', approvalsCount, minApprovals });
    }
  }

  // Safety: validate workflow definition before publishing.
  const validation = validateDefinition(wf.definition);
  if (!validation.ok) {
    return json(400, { ok: false, error: 'invalid_workflow_definition', details: validation.errors });
  }

  const now = new Date().toISOString();
  const signature = await signWorkflowVersion({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, workflowId });

  await hasuraRequest({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    query: `mutation Publish($id: uuid!, $set: workflow_definitions_set_input!, $audit: workflow_publication_audits_insert_input!) {
      update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $set) { id status published_version }
      insert_workflow_publication_audits_one(object: $audit) { id }
    }`,
    variables: {
      id: workflowId,
      set: {
        status: 'published',
        published_at: now,
        published_by: actorUserId,
        published_version: wf.version,
      },
      audit: {
        workflow_id: workflowId,
        action: 'publish',
        from_version: wf.version,
        to_version: wf.version,
        actor_user_id: actorUserId,
        signature: signature || null,
        metadata: {
          previous_status: wf.status,
          published_at: now,
          approvals_count: approvalsCount,
          min_approvals: minApprovals,
          validator: validation,
        },
      },
    },
  });

  return json(200, { ok: true, published_version: wf.version, approvalsCount, minApprovals, signature });
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
    console.error('[workflow-publish] hasura error', resp.status, j?.errors || j);
    throw new Error(j?.errors?.[0]?.message || 'hasura_error');
  }
  return j.data;
}

async function loadWorkflow(args: { hasuraUrl: string; adminSecret: string; workflowId: string }) {
  const q = `query Wf($id: uuid!) {
    workflow_definitions_by_pk(id: $id) { id status version district_id school_id definition }
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

function validateDefinition(def: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!def || typeof def !== 'object') {
    return { ok: false, errors: ['Definition must be an object'] };
  }

  const steps = Array.isArray(def.steps) ? def.steps : [];
  if (!steps.length) {
    return { ok: false, errors: ['Definition.steps must be a non-empty array'] };
  }

  if (steps.length > 50) {
    errors.push('Too many steps (max 50)');
  }

  const allowedTypes = new Set(['create_entity', 'update_entity', 'condition', 'notify', 'noop']);
  const allowedEntities = new Set([
    'partner_submissions',
    'partner_incentive_applications',
    'partner_contracts',
    'notifications',
    'messaging_requests',
  ]);

  for (const step of steps) {
    const id = String(step?.id ?? '');
    const type = String(step?.type ?? '');
    if (!id) errors.push('Each step must have an id');
    if (!allowedTypes.has(type)) errors.push(`Unsupported step type: ${type}`);

    if ((type === 'create_entity' || type === 'update_entity') && step?.config) {
      const entity = String(step.config.entity ?? '');
      if (entity && !allowedEntities.has(entity)) {
        errors.push(`Entity not allowed for ${id}: ${entity}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
