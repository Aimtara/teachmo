import { getActorScope } from '../_shared/tenantScope';
import { hasActionName } from '../_shared/rbac';
import { isUuid, sanitizeEventName, sanitizeTelemetryMetadata } from '../_shared/pii/telemetry';

/**
 * Future-grade workflow runner:
 * - Records analytics events (event_ts + metadata)
 * - Dispatches workflows matching {type:'event', event_name}
 * - Executes supported actions with tenant-safe whitelists
 * - Supports branching via condition steps (on_true/on_false edges)
 */

type EventPayload = {
  eventName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const WORKFLOW_MAX_STEPS = 50;
const MAX_BODY_BYTES = 32_768; // 32KB

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!HASURA_URL || !ADMIN_SECRET) {
    return json(500, { error: 'Missing HASURA_GRAPHQL_ENDPOINT or HASURA_GRAPHQL_ADMIN_SECRET' });
  }

  const actorUserId = req.headers.get('x-nhost-user-id') || req.headers.get('x-hasura-user-id');
  if (!actorUserId) {
    return json(401, { error: 'Not authenticated' });
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    return json(413, { error: 'Payload too large' });
  }

  let payload: EventPayload;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: 'Payload too large' });
    }
    payload = JSON.parse(raw) as EventPayload;
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const eventName = sanitizeEventName((payload as any)?.eventName);
  if (!eventName) {
    return json(400, { error: 'Invalid eventName' });
  }

  const scope = await getActorScope(
    async (query, variables) => ({
      data: await hasuraRequest({ hasuraUrl: HASURA_URL, adminSecret: ADMIN_SECRET, query, variables }),
    }),
    actorUserId
  );

  const metaResult = sanitizeTelemetryMetadata((payload as any)?.metadata || {}, { maxBytes: 8192 });
  const clientMeta =
    metaResult.value && typeof metaResult.value === 'object' && !Array.isArray(metaResult.value)
      ? (metaResult.value as Record<string, unknown>)
      : { value: metaResult.value };

  const metadata: Record<string, unknown> = {
    ...clientMeta,
    actor_role: scope.role,
    actor_district_id: scope.districtId || null,
    actor_school_id: scope.schoolId || null,
    source: 'client',
    ...(metaResult.truncated ? { meta_truncated: true } : {}),
    ...(metaResult.redacted ? { meta_redacted: true } : {}),
  };

  const entityId = isUuid((payload as any)?.entityId) ? (payload as any)?.entityId : null;
  if ((payload as any)?.entityId && !entityId) {
    metadata.entity_id_raw = String((payload as any).entityId).slice(0, 200);
  }

  const entityType =
    typeof (payload as any)?.entityType === 'string' ? String((payload as any).entityType).slice(0, 64) : null;

  // Guard “power” meta flags so they aren't quietly abused by any authenticated user.
  if (metadata?.replayed === true || metadata?.replayed_from_run_id) {
    if (!hasActionName(scope.role, 'automation:replay')) {
      return json(403, { ok: false, error: 'forbidden_replay' });
    }
  }
  if (metadata?.simulated === true || metadata?.workflow_editor === true) {
    if (!hasActionName(scope.role, 'automation:manage')) {
      return json(403, { ok: false, error: 'forbidden_simulation' });
    }
  }

  // 1) Insert analytics event
  const insertedEventId = await insertAnalyticsEvent({
    hasuraUrl: HASURA_URL,
    adminSecret: ADMIN_SECRET,
    object: {
      event_name: eventName,
      actor_user_id: actorUserId,
      district_id: scope.districtId,
      school_id: scope.schoolId,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    },
  });

  // 2) Dispatch + execute matching workflows (soft-fail)
  try {
    await dispatchAndExecuteWorkflows({
      hasuraUrl: HASURA_URL,
      adminSecret: ADMIN_SECRET,
      actorUserId,
      scope,
      eventName,
      eventId: insertedEventId,
      eventMetadata: metadata,
    });
  } catch (e: any) {
    console.error('[track-event] workflow dispatch failed', e?.message || e);
  }

  return json(200, { ok: true, id: insertedEventId });
}

async function hasuraRequest(args: {
  hasuraUrl: string;
  adminSecret: string;
  query: string;
  variables?: Record<string, unknown>;
}) {
  const resp = await fetch(args.hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': args.adminSecret,
    },
    body: JSON.stringify({ query: args.query, variables: args.variables || {} }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Hasura request failed: ${resp.status} ${t}`);
  }
  const json = (await resp.json()) as any;
  if (json?.errors?.length) {
    throw new Error(`Hasura error: ${JSON.stringify(json.errors)}`);
  }
  return json?.data;
}

async function insertAnalyticsEvent(args: {
  hasuraUrl: string;
  adminSecret: string;
  object: Record<string, unknown>;
}): Promise<string | undefined> {
  const query = `mutation InsertEvent($object: analytics_events_insert_input!) {
    insert_analytics_events_one(object: $object) { id }
  }`;

  try {
    const data = await hasuraRequest({
      hasuraUrl: args.hasuraUrl,
      adminSecret: args.adminSecret,
      query,
      variables: { object: args.object },
    });
    return data?.insert_analytics_events_one?.id as string | undefined;
  } catch (e) {
    // telemetry should never break the app
    console.error('[track-event] failed to insert analytics event', e);
    return undefined;
  }
}

async function dispatchAndExecuteWorkflows(args: {
  hasuraUrl: string;
  adminSecret: string;
  actorUserId: string;
  scope: { role: string; districtId?: string | null; schoolId?: string | null };
  eventName: string;
  eventId?: string;
  eventMetadata: Record<string, unknown>;
}) {
  const { hasuraUrl, adminSecret, actorUserId, scope, eventName, eventId, eventMetadata } = args;

  const trigger = { type: 'event', event_name: eventName };

  const workflowsQuery = `
    query GetWorkflows($trigger: jsonb!, $districtId: uuid, $schoolId: uuid) {
      workflow_definitions(
        where: {
          status: { _eq: "published" },
          trigger: { _contains: $trigger },
          _and: [
            { _or: [{ district_id: { _is_null: true } }, { district_id: { _eq: $districtId } }] },
            { _or: [{ school_id: { _is_null: true } }, { school_id: { _eq: $schoolId } }] }
          ]
        }
        order_by: { updated_at: desc }
      ) {
        id
        name
        trigger
        definition
        version
        pinned_version
        published_version
        district_id
        school_id
      }
    }
  `;

  const data = await hasuraRequest({
    hasuraUrl,
    adminSecret,
    query: workflowsQuery,
    variables: { trigger, districtId: scope.districtId || null, schoolId: scope.schoolId || null },
  });

  const workflows = (data?.workflow_definitions || []) as any[];
  if (!workflows.length) return;

  await insertAnalyticsEvent({
    hasuraUrl,
    adminSecret,
    object: {
      event_name: 'workflow.dispatched',
      actor_user_id: actorUserId,
      district_id: scope.districtId || null,
      school_id: scope.schoolId || null,
      metadata: { workflow_count: workflows.length, source_event: eventName },
    },
  });

  for (const wf of workflows) {
    const districtId = wf.district_id || scope.districtId || null;
    const schoolId = wf.school_id || scope.schoolId || null;

    // If the workflow is pinned (or otherwise directed) to a historical version, fetch that snapshot.
    let effectiveDefinition = wf.definition;
    let effectiveVersion = wf.version;
    const desiredVersion = wf.pinned_version ?? wf.published_version ?? wf.version;
    if (desiredVersion != null && desiredVersion !== wf.version) {
      const snap = await getWorkflowSnapshot({
        hasuraUrl,
        adminSecret,
        workflowId: wf.id,
        version: desiredVersion,
      });
      if (snap?.definition) {
        effectiveDefinition = snap.definition;
        effectiveVersion = snap.version ?? desiredVersion;
      }
    }

    const idempotencyKey = eventId ? `evt:${eventId}:wf:${wf.id}:v:${effectiveVersion}` : null;

    await runWorkflow({
      hasuraUrl,
      adminSecret,
      workflowId: wf.id,
      workflowName: wf.name,
      workflowVersion: effectiveVersion,
      districtId,
      schoolId,
      actorUserId,
      eventId: eventId || null,
      idempotencyKey,
      input: {
        event_id: eventId || null,
        event_name: eventName,
        event_metadata: eventMetadata,
        actor_user_id: actorUserId,
        actor_role: scope.role,
        actor_district_id: districtId,
        actor_school_id: schoolId,
      },
      definition: effectiveDefinition,
    });
  }
}

async function getWorkflowSnapshot(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  version: number;
}): Promise<{ version: number; definition: any } | null> {
  const q = `query Snapshot($workflowId: uuid!, $version: Int!) {
    workflow_definition_versions(
      where: { workflow_id: { _eq: $workflowId }, version: { _eq: $version } }
      limit: 1
    ) {
      version
      definition
    }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: q,
    variables: { workflowId: args.workflowId, version: args.version },
  });

  const row = (data?.workflow_definition_versions || [])[0];
  if (!row) return null;
  return { version: row.version, definition: row.definition };
}

type WorkflowStep = {
  id?: string;
  key?: string;
  type: string;
  config?: Record<string, unknown>;
  next?: string;
  on_true?: string;
  on_false?: string;
};

const ENTITY_REGISTRY: Record<
  string,
  {
    insertOne: string;
    updateByPk: string;
    allowedFields: string[];
    tenantFields?: { district?: string; school?: string };
  }
> = {
  // Partner ops
  partner_submissions: {
    insertOne: 'insert_partner_submissions_one',
    updateByPk: 'update_partner_submissions_by_pk',
    allowedFields: ['district_id', 'school_id', 'partner_name', 'program', 'contact_email', 'status', 'details', 'metadata'],
    tenantFields: { district: 'district_id', school: 'school_id' },
  },
  partner_incentive_applications: {
    insertOne: 'insert_partner_incentive_applications_one',
    updateByPk: 'update_partner_incentive_applications_by_pk',
    allowedFields: ['district_id', 'school_id', 'incentive_id', 'partner_name', 'contact_email', 'status', 'notes', 'metadata'],
    tenantFields: { district: 'district_id', school: 'school_id' },
  },
  partner_contracts: {
    insertOne: 'insert_partner_contracts_one',
    updateByPk: 'update_partner_contracts_by_pk',
    allowedFields: ['district_id', 'school_id', 'partner_name', 'status', 'contract_url', 'metadata'],
    tenantFields: { district: 'district_id', school: 'school_id' },
  },
  // Notifications (in-app)
  notifications: {
    insertOne: 'insert_notifications_one',
    updateByPk: 'update_notifications_by_pk',
    allowedFields: ['user_id', 'type', 'severity', 'title', 'body', 'entity_type', 'entity_id', 'dedupe_key', 'dedupe_until', 'metadata'],
  },
  // Messaging requests
  messaging_requests: {
    insertOne: 'insert_messaging_requests_one',
    updateByPk: 'update_messaging_requests_by_pk',
    allowedFields: ['district_id', 'school_id', 'requester_user_id', 'status', 'reason', 'metadata'],
    tenantFields: { district: 'district_id', school: 'school_id' },
  },
  // Tenant settings (mostly update-only, but allow insert for bootstrap)
  tenant_settings: {
    insertOne: 'insert_tenant_settings_one',
    updateByPk: 'update_tenant_settings_by_pk',
    allowedFields: ['district_id', 'school_id', 'branding', 'settings'],
    tenantFields: { district: 'district_id', school: 'school_id' },
  },
};

async function runWorkflow(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  districtId: string | null;
  schoolId: string | null;
  actorUserId: string;
  eventId?: string | null;
  idempotencyKey?: string | null;
  input: Record<string, unknown>;
  definition: any;
}) {
  const {
    hasuraUrl,
    adminSecret,
    workflowId,
    workflowName,
    workflowVersion,
    districtId,
    schoolId,
    actorUserId,
    eventId,
    idempotencyKey,
    input,
    definition,
  } = args;
  const startedAt = new Date().toISOString();

  // Idempotency: if this event/workflow pair already produced a run, do not re-run.
  if (idempotencyKey) {
    const existing = await findExistingRunByIdempotency({ hasuraUrl, adminSecret, workflowId, idempotencyKey });
    if (existing?.id) {
      await insertAnalyticsEvent({
        hasuraUrl,
        adminSecret,
        object: {
          event_name: 'workflow.run_deduped',
          actor_user_id: actorUserId,
          district_id: districtId,
          school_id: schoolId,
          entity_type: 'workflow_run',
          entity_id: existing.id,
          metadata: { workflow_id: workflowId, idempotency_key: idempotencyKey, status: existing.status },
        },
      });
      return;
    }
  }

  const runInsert = `mutation CreateRun($run: workflow_runs_insert_input!) {
    insert_workflow_runs_one(object: $run) { id }
  }`;

  const runData = await hasuraRequest({
    hasuraUrl,
    adminSecret,
    query: runInsert,
    variables: {
      run: {
        workflow_id: workflowId,
        district_id: districtId,
        school_id: schoolId,
        actor_user_id: actorUserId,
        event_id: eventId || null,
        idempotency_key: idempotencyKey || null,
        status: 'running',
        started_at: startedAt,
        input,
        output: { workflow_name: workflowName, workflow_version: workflowVersion },
      },
    },
  });

  const runId = runData?.insert_workflow_runs_one?.id as string | undefined;
  if (!runId) return;

  await insertAnalyticsEvent({
    hasuraUrl,
    adminSecret,
    object: {
      event_name: 'workflow.run_started',
      actor_user_id: actorUserId,
      district_id: districtId,
      school_id: schoolId,
      entity_type: 'workflow_run',
      entity_id: runId,
      metadata: { workflow_id: workflowId, workflow_name: workflowName, workflow_version: workflowVersion },
    },
  });

  const exec = await executeWorkflowDefinition({
    hasuraUrl,
    adminSecret,
    runId,
    workflowId,
    districtId,
    schoolId,
    actorUserId,
    input,
    definition,
  });

  const finishedAt = new Date().toISOString();

  const finalize = `mutation FinishRun($id: uuid!, $status: String!, $finished: timestamptz!, $output: jsonb!) {
    update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: $status, finished_at: $finished, output: $output }) { id }
  }`;
  await hasuraRequest({
    hasuraUrl,
    adminSecret,
    query: finalize,
    variables: {
      id: runId,
      status: exec.ok ? 'succeeded' : 'failed',
      finished: finishedAt,
      output: exec.output,
    },
  });

  await insertAnalyticsEvent({
    hasuraUrl,
    adminSecret,
    object: {
      event_name: exec.ok ? 'workflow.run_succeeded' : 'workflow.run_failed',
      actor_user_id: actorUserId,
      district_id: districtId,
      school_id: schoolId,
      entity_type: 'workflow_run',
      entity_id: runId,
      metadata: {
        workflow_id: workflowId,
        ok: exec.ok,
        steps_executed: exec.output?.steps_executed,
        error: exec.output?.error || null,
      },
    },
  });
}

async function executeWorkflowDefinition(args: {
  hasuraUrl: string;
  adminSecret: string;
  runId: string;
  workflowId: string;
  districtId: string | null;
  schoolId: string | null;
  actorUserId: string;
  input: Record<string, unknown>;
  definition: any;
}): Promise<{ ok: boolean; output: any }> {
  const { hasuraUrl, adminSecret, runId, workflowId, districtId, schoolId, actorUserId, input, definition } = args;

  const stepsArr: WorkflowStep[] = Array.isArray(definition?.steps) ? definition.steps : [];
  if (!stepsArr.length) {
    return { ok: true, output: { steps_executed: 0 } };
  }

  // Normalize steps: ensure ids.
  const steps: WorkflowStep[] = stepsArr.map((s, idx) => ({
    ...s,
    id: s.id || s.key || `step_${idx + 1}`,
  }));

  const byId = new Map<string, WorkflowStep>();
  steps.forEach((s) => byId.set(String(s.id), s));

  // Start node id
  const startId = typeof definition?.start === 'string' ? definition.start : String(steps[0].id);

  const ctx: any = {
    ...input,
    steps: {},
    district_id: districtId,
    school_id: schoolId,
  };

  const executed: any[] = [];
  const seen = new Set<string>();

  let currentId: string | null = startId;
  let stepCounter = 0;

  while (currentId) {
    stepCounter += 1;
    if (stepCounter > WORKFLOW_MAX_STEPS) {
      return {
        ok: false,
        output: {
          error: `Workflow exceeded max steps (${WORKFLOW_MAX_STEPS}). Possible loop.`,
          steps_executed: executed.length,
          executed,
        },
      };
    }

    if (seen.has(currentId)) {
      return {
        ok: false,
        output: {
          error: `Workflow loop detected at step '${currentId}'.`,
          steps_executed: executed.length,
          executed,
        },
      };
    }

    seen.add(currentId);
    const step = byId.get(currentId);
    if (!step) {
      return {
        ok: false,
        output: {
          error: `Workflow referenced missing step '${currentId}'.`,
          steps_executed: executed.length,
          executed,
        },
      };
    }

    const { ok, out, next } = await executeStepWithRetry({
      hasuraUrl,
      adminSecret,
      runId,
      workflowId,
      districtId,
      schoolId,
      actorUserId,
      step,
      ctx,
      stepsList: steps,
    });

    executed.push({ step_id: step.id, type: step.type, ok, output: out });
    ctx.steps[String(step.id)] = { output: out, ok };

    if (!ok) {
      return {
        ok: false,
        output: { error: out?.error || 'Step failed', steps_executed: executed.length, executed },
      };
    }

    currentId = next;
  }

  return { ok: true, output: { steps_executed: executed.length, executed } };
}

async function insertRunStep(args: {
  hasuraUrl: string;
  adminSecret: string;
  runId: string;
  stepKey: string;
  status: string;
  input: any;
  output: any;
}) {
  const q = `mutation InsertStep($object: workflow_run_steps_insert_input!) {
    insert_workflow_run_steps_one(object: $object) { id }
  }`;

  await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: q,
    variables: {
      object: {
        run_id: args.runId,
        step_key: args.stepKey,
        status: args.status,
        input: args.input,
        output: args.output,
      },
    },
  });
}

async function findExistingRunByIdempotency(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  idempotencyKey: string;
}): Promise<{ id: string; status: string } | null> {
  const q = `query ExistingRun($workflowId: uuid!, $key: String!) {
    workflow_runs(where: { workflow_id: { _eq: $workflowId }, idempotency_key: { _eq: $key } }, order_by: { started_at: desc }, limit: 1) {
      id
      status
    }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: q,
    variables: { workflowId: args.workflowId, key: args.idempotencyKey },
  });

  const row = (data?.workflow_runs || [])[0];
  if (!row) return null;
  return { id: row.id, status: row.status };
}

async function insertDeadLetter(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  runId: string;
  stepKey: string;
  actorUserId: string;
  districtId: string | null;
  schoolId: string | null;
  input: any;
  error: string | null;
  metadata?: any;
}) {
  const q = `mutation DeadLetter($obj: workflow_dead_letters_insert_input!) {
    insert_workflow_dead_letters_one(object: $obj) { id }
  }`;

  await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: q,
    variables: {
      obj: {
        workflow_id: args.workflowId,
        run_id: args.runId,
        step_key: args.stepKey,
        actor_user_id: args.actorUserId,
        district_id: args.districtId,
        school_id: args.schoolId,
        input: args.input,
        error: args.error,
        metadata: args.metadata || {},
      },
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeStepWithRetry(args: {
  hasuraUrl: string;
  adminSecret: string;
  runId: string;
  workflowId: string;
  districtId: string | null;
  schoolId: string | null;
  actorUserId: string;
  step: WorkflowStep;
  ctx: any;
  stepsList: WorkflowStep[];
}) {
  const cfg = (args.step.config || {}) as any;
  const retry = cfg?.retry || {};
  const maxAttempts = Math.max(1, Math.min(5, Number(retry.max_attempts ?? retry.maxAttempts ?? 1)));
  const backoffMs = Math.max(0, Math.min(3000, Number(retry.backoff_ms ?? retry.backoffMs ?? 0)));
  const allowRetry = Boolean(maxAttempts > 1);

  let last: any = null;
  for (let attempt = 1; attempt <= (allowRetry ? maxAttempts : 1); attempt++) {
    const res = await executeStep({ ...args, attemptInfo: { attempt, maxAttempts } });
    last = { ...res, attemptInfo: { attempt, maxAttempts } };
    if (last.ok) return last;
    const err = String(last?.out?.error || '');
    // Don't retry permission failures / unsupported types.
    if (err === 'insufficient_permissions' || err.startsWith('Unsupported step type')) break;
    if (attempt < maxAttempts) {
      await sleep(backoffMs * attempt);
    }
  }

  // Final failure: capture dead letter (unless explicitly disabled)
  const deadLetterEnabled = cfg?.dead_letter !== false;
  if (deadLetterEnabled) {
    await insertDeadLetter({
      hasuraUrl: args.hasuraUrl,
      adminSecret: args.adminSecret,
      workflowId: args.workflowId,
      runId: args.runId,
      stepKey: String(args.step.id || args.step.key || ''),
      actorUserId: args.actorUserId,
      districtId: args.districtId,
      schoolId: args.schoolId,
      input: { step: args.step, attempt: last?.attemptInfo?.attempt ?? null, max_attempts: last?.attemptInfo?.maxAttempts ?? null },
      error: String(last?.out?.error || 'step_failed'),
      metadata: { attempts: maxAttempts, backoff_ms: backoffMs, last_output: last?.out || null },
    });
  }

  return last;
}

async function executeStep(args: {
  hasuraUrl: string;
  adminSecret: string;
  runId: string;
  workflowId: string;
  districtId: string | null;
  schoolId: string | null;
  actorUserId: string;
  step: WorkflowStep;
  ctx: any;
  stepsList: WorkflowStep[];
  attemptInfo?: { attempt: number; maxAttempts: number };
}): Promise<{ ok: boolean; out: any; next: string | null }> {
  const { hasuraUrl, adminSecret, runId, workflowId, districtId, schoolId, actorUserId, step, ctx, stepsList } = args;

  const stepKey = String(step.id || step.key || 'step');
  const attemptInfo = args.attemptInfo || null;
  const stepInput = attemptInfo ? { ...step, __attempt: attemptInfo.attempt, __max_attempts: attemptInfo.maxAttempts } : step;

  const defaultNext = () => {
    if (step.next) return String(step.next);
    const idx = stepsList.findIndex((s) => String(s.id) === stepKey);
    if (idx >= 0 && idx < stepsList.length - 1) return String(stepsList[idx + 1].id);
    return null;
  };

  const config = (step.config || {}) as Record<string, unknown>;

  // Optional per-step permission gating: fail-closed.
  // If you set config.required_action on a step, we only execute it when the triggering actor has that action.
  const requiredAction = (config.required_action ?? config.requiredAction) as unknown;
  if (requiredAction && step.type !== 'condition' && step.type !== 'noop') {
    const actionName = String(requiredAction);
    const allowed = hasActionName(ctx?.actor_role, actionName);
    if (!allowed) {
      const out = {
        error: 'insufficient_permissions',
        required_action: actionName,
        actor_role: ctx?.actor_role ?? null,
      };
      await insertRunStep({
        hasuraUrl,
        adminSecret,
        runId,
        stepKey,
        status: 'skipped',
        input: stepInput,
        output: out,
      });
      return { ok: false, out, next: null };
    }
  }

  try {
    if (step.type === 'condition') {
      const left = resolveTemplates(config.left, ctx);
      const right = resolveTemplates(config.right, ctx);
      const op = String(config.op || 'eq');
      const result = evaluateCondition(left, op, right);

      const out = { result, left, op, right };
      await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'succeeded', input: stepInput, output: out });

      const next = result
        ? (step.on_true ? String(step.on_true) : defaultNext())
        : (step.on_false ? String(step.on_false) : defaultNext());

      return { ok: true, out, next };
    }

    if (step.type === 'noop') {
      const out = { ok: true };
      await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'succeeded', input: stepInput, output: out });
      return { ok: true, out, next: defaultNext() };
    }

    if (step.type === 'notify') {
      const userId = String(resolveTemplates(config.user_id, ctx) || actorUserId);
      const type = String(resolveTemplates(config.type, ctx) || 'automation');
      const severity = String(resolveTemplates(config.severity, ctx) || 'info');
      const title = String(resolveTemplates(config.title, ctx) || 'Automation');
      const body = String(resolveTemplates(config.body, ctx) || '');
      const entityType = config.entity_type ? String(resolveTemplates(config.entity_type, ctx)) : null;
      const entityId = config.entity_id ? String(resolveTemplates(config.entity_id, ctx)) : null;
      const meta = (resolveTemplates(config.metadata, ctx) || {}) as any;

      const out = await createEntity({
        hasuraUrl,
        adminSecret,
        entity: 'notifications',
        districtId,
        schoolId,
        fields: {
          user_id: userId,
          type,
          severity,
          title,
          body,
          entity_type: entityType,
          entity_id: entityId,
          metadata: meta,
        },
      });

      await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'succeeded', input: stepInput, output: out });
      return { ok: true, out, next: defaultNext() };
    }

    if (step.type === 'create_entity') {
      const entity = String(config.entity || '');
      const fields = (resolveTemplates(config.fields || {}, ctx) || {}) as any;
      const out = await createEntity({ hasuraUrl, adminSecret, entity, districtId, schoolId, fields });
      await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'succeeded', input: stepInput, output: out });
      return { ok: true, out, next: defaultNext() };
    }

    if (step.type === 'update_entity') {
      const entity = String(config.entity || '');
      const pk = (resolveTemplates(config.pk || {}, ctx) || {}) as any;
      const set = (resolveTemplates(config.set || {}, ctx) || {}) as any;
      const out = await updateEntityByPk({ hasuraUrl, adminSecret, entity, pk, districtId, schoolId, set });
      await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'succeeded', input: stepInput, output: out });
      return { ok: true, out, next: defaultNext() };
    }

    const out = { error: `Unsupported step type: ${step.type}` };
    await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'failed', input: stepInput, output: out });
    return { ok: false, out, next: null };
  } catch (e: any) {
    const out = { error: e?.message || String(e), attempt: attemptInfo?.attempt ?? 1, max_attempts: attemptInfo?.maxAttempts ?? 1 };
    await insertRunStep({ hasuraUrl, adminSecret, runId, stepKey, status: 'failed', input: stepInput, output: out });

    await insertAnalyticsEvent({
      hasuraUrl,
      adminSecret,
      object: {
        event_name: 'workflow.step_failed',
        actor_user_id: actorUserId,
        district_id: districtId,
        school_id: schoolId,
        entity_type: 'workflow_run',
        entity_id: runId,
        metadata: { workflow_id: workflowId, step_key: stepKey, error: out.error },
      },
    });

    return { ok: false, out, next: null };
  }
}

function evaluateCondition(left: any, op: string, right: any): boolean {
  switch (op) {
    case 'eq':
      return left === right;
    case 'neq':
    case 'ne':
      return left !== right;
    case 'gt':
      return Number(left) > Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'lte':
      return Number(left) <= Number(right);
    case 'contains':
      return String(left || '').includes(String(right || ''));
    case 'ncontains':
      return !String(left || '').includes(String(right || ''));
    case 'in':
      return Array.isArray(right) ? right.includes(left) : false;
    case 'exists':
      return left !== null && left !== undefined && String(left) !== '';
    default:
      return left === right;
  }
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function resolveStringTemplate(input: string, ctx: any) {
  const exact = input.match(/^\{\{\s*([^}]+)\s*\}\}$/);
  if (exact) {
    const p = exact[1].trim();
    return getPath(ctx, p);
  }
  return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, p) => {
    const v = getPath(ctx, String(p).trim());
    if (v === null || v === undefined) return '';
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

function resolveTemplates(value: any, ctx: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return resolveStringTemplate(value, ctx);
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, ctx));
  if (typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveTemplates(v, ctx);
    }
    return out;
  }
  return value;
}

function pickAllowedFields(entityKey: string, raw: Record<string, unknown>): Record<string, unknown> {
  const reg = ENTITY_REGISTRY[entityKey];
  if (!reg) throw new Error(`Unsupported entity: ${entityKey}`);
  const out: Record<string, unknown> = {};
  for (const k of reg.allowedFields) {
    if (raw[k] !== undefined) out[k] = raw[k];
  }
  return out;
}

async function createEntity(args: {
  hasuraUrl: string;
  adminSecret: string;
  entity: string;
  districtId: string | null;
  schoolId: string | null;
  fields: Record<string, unknown>;
}) {
  const reg = ENTITY_REGISTRY[args.entity];
  if (!reg) throw new Error(`Unsupported entity: ${args.entity}`);

  const fields = { ...args.fields } as any;
  if (reg.tenantFields?.district && args.districtId) {
    fields[reg.tenantFields.district] = args.districtId;
  }
  if (reg.tenantFields?.school && args.schoolId) {
    fields[reg.tenantFields.school] = args.schoolId;
  }

  const safeFields = pickAllowedFields(args.entity, fields);

  const mutation = `mutation Insert($object: ${args.entity}_insert_input!) {
    ${reg.insertOne}(object: $object) { id }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: mutation,
    variables: { object: safeFields },
  });

  const id = (data?.[reg.insertOne]?.id as string | undefined) || undefined;
  return { entity: args.entity, id };
}

async function updateEntityByPk(args: {
  hasuraUrl: string;
  adminSecret: string;
  entity: string;
  pk: Record<string, unknown>;
  districtId: string | null;
  schoolId: string | null;
  set: Record<string, unknown>;
}) {
  const reg = ENTITY_REGISTRY[args.entity];
  if (!reg) throw new Error(`Unsupported entity: ${args.entity}`);

  if (!args.pk || !('id' in args.pk)) {
    throw new Error('update_entity requires pk.id');
  }

  const patch = { ...args.set } as any;
  if (reg.tenantFields?.district && args.districtId) {
    patch[reg.tenantFields.district] = args.districtId;
  }
  if (reg.tenantFields?.school && args.schoolId) {
    patch[reg.tenantFields.school] = args.schoolId;
  }

  const safeSet = pickAllowedFields(args.entity, patch);

  const mutation = `mutation Update($id: uuid!, $set: ${args.entity}_set_input!) {
    ${reg.updateByPk}(pk_columns: { id: $id }, _set: $set) { id }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: mutation,
    variables: { id: args.pk.id, set: safeSet },
  });

  const id = (data?.[reg.updateByPk]?.id as string | undefined) || undefined;
  return { entity: args.entity, id };
}
