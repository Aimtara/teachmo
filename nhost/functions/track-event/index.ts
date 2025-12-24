import { getActorScope } from '../_shared/tenantScope';

type EventPayload = {
  eventName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

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

  let payload: EventPayload;
  try {
    payload = (await req.json()) as EventPayload;
  } catch (e) {
    return json(400, { error: 'Invalid JSON' });
  }

  const eventName = typeof payload.eventName === 'string' ? payload.eventName.trim() : '';
  if (!eventName) {
    return json(400, { error: 'eventName required' });
  }

  const scope = await getActorScope({ actorUserId, hasuraEndpoint: HASURA_URL, adminSecret: ADMIN_SECRET });

  const metadata: Record<string, unknown> = {
    ...(payload.metadata || {}),
    actor_role: scope.role,
    actor_scope: scope.scope,
    actor_district_id: scope.districtId || null,
    actor_school_id: scope.schoolId || null,
    source: 'client'
  };

  const insertEventQuery = `
    mutation InsertEvent($object: analytics_events_insert_input!) {
      insert_analytics_events_one(object: $object) { id }
    }
  `;

  const eventObject = {
    event_name: eventName,
    actor_user_id: actorUserId,
    district_id: scope.districtId,
    school_id: scope.schoolId,
    entity_type: payload.entityType || null,
    entity_id: payload.entityId || null,
    metadata
  };

  const insertResp = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET
    },
    body: JSON.stringify({ query: insertEventQuery, variables: { object: eventObject } })
  });

  if (!insertResp.ok) {
    const text = await insertResp.text();
    return json(500, { error: 'Failed to insert event', details: text });
  }

  const insertJson = (await insertResp.json()) as any;
  const insertedEventId = insertJson?.data?.insert_analytics_events_one?.id as string | undefined;

  // Optionally dispatch matching workflows. This keeps analytics “alive” without manual instrumentation.
  try {
    await dispatchWorkflows({
      hasuraUrl: HASURA_URL,
      adminSecret: ADMIN_SECRET,
      actorUserId,
      scope,
      eventName,
      eventId: insertedEventId,
      eventMetadata: metadata
    });
  } catch (e: any) {
    // Soft-fail: telemetry should never break the app.
    console.error('[track-event] workflow dispatch failed', e?.message || e);
  }

  return json(200, { ok: true, id: insertedEventId });
}

async function dispatchWorkflows(args: {
  hasuraUrl: string;
  adminSecret: string;
  actorUserId: string;
  scope: { role: string; scope: string; districtId?: string | null; schoolId?: string | null };
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
          status: { _eq: "active" },
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
        district_id
        school_id
      }
    }
  `;

  const wfResp = await fetch(hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret
    },
    body: JSON.stringify({
      query: workflowsQuery,
      variables: { trigger, districtId: scope.districtId || null, schoolId: scope.schoolId || null }
    })
  });

  if (!wfResp.ok) return;
  const wfJson = (await wfResp.json()) as any;
  const workflows = (wfJson?.data?.workflow_definitions || []) as any[];
  if (!workflows.length) return;

  for (const wf of workflows) {
    await createWorkflowRun({
      hasuraUrl,
      adminSecret,
      workflowId: wf.id,
      districtId: wf.district_id || scope.districtId || null,
      schoolId: wf.school_id || scope.schoolId || null,
      actorUserId,
      input: { event_id: eventId || null, event_name: eventName, event_metadata: eventMetadata },
      definition: wf.definition
    });
  }

  // Emit a lightweight telemetry event indicating workflows were dispatched.
  const insertEventQuery = `
    mutation InsertEvent($object: analytics_events_insert_input!) {
      insert_analytics_events_one(object: $object) { id }
    }
  `;
  await fetch(hasuraUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({
      query: insertEventQuery,
      variables: {
        object: {
          event_name: 'workflow.dispatched',
          actor_user_id: actorUserId,
          district_id: scope.districtId,
          school_id: scope.schoolId,
          metadata: { workflow_count: workflows.length, source_event: eventName }
        }
      }
    })
  });
}

async function createWorkflowRun(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
  districtId: string | null;
  schoolId: string | null;
  actorUserId: string;
  input: Record<string, unknown>;
  definition: any;
}) {
  const { hasuraUrl, adminSecret, workflowId, districtId, schoolId, actorUserId, input, definition } = args;

  const steps = Array.isArray(definition?.steps) ? definition.steps : [];
  const now = new Date().toISOString();

  const run = {
    workflow_id: workflowId,
    district_id: districtId,
    school_id: schoolId,
    actor_user_id: actorUserId,
    status: 'planned',
    started_at: now,
    input,
    output: { intended_only: true }
  };

  // Note: we don't execute actions here; we record intended operations for auditability.
  const stepRows = steps.map((s: any, idx: number) => ({
    run_id: null, // filled by Hasura relationship? We'll insert steps after run in a second call if needed.
    step_key: s.key || s.id || `step_${idx + 1}`,
    status: 'planned',
    input: s,
    output: null
  }));

  // Hasura can't reference run_id from insert_workflow_runs_one in the same mutation for another insert,
  // so do it in two calls.
  const runOnly = `mutation CreateRunOnly($run: workflow_runs_insert_input!) { insert_workflow_runs_one(object: $run) { id } }`;
  const runResp = await fetch(hasuraUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ query: runOnly, variables: { run } })
  });
  if (!runResp.ok) return;
  const runJson = (await runResp.json()) as any;
  const runId = runJson?.data?.insert_workflow_runs_one?.id as string | undefined;
  if (!runId) return;

  const stepObjects = stepRows.map((s: any) => ({ ...s, run_id: runId }));
  const stepsMutation = `mutation InsertSteps($steps: [workflow_run_steps_insert_input!]!) { insert_workflow_run_steps(objects: $steps) { affected_rows } }`;
  await fetch(hasuraUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ query: stepsMutation, variables: { steps: stepObjects } })
  });

  // Mark run complete immediately (intended operations only)
  const finish = `mutation FinishRun($id: uuid!, $finished: timestamptz!, $status: String!) {
    update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: $status, finished_at: $finished}) { id }
  }`;
  await fetch(hasuraUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ query: finish, variables: { id: runId, finished: new Date().toISOString(), status: 'recorded' } })
  });
}
