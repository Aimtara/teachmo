import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTenantScope } from '@/hooks/useTenantScope';
import { graphql } from '@/lib/graphql';
import { trackEvent } from '@/observability/telemetry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowGraphEditor } from '@/components/admin/workflows/WorkflowGraphEditor';

const DEFAULT_TRIGGER = { type: 'event', event_name: 'messaging.message_sent' };
const DEFAULT_DEF = {
  version: 2,
  // v2 supports branching via condition steps with on_true/on_false edges.
  // Steps may be a linear list (default next = next array item) or an explicit graph.
  steps: [
    // Example:
    // { id: 'step_1', type: 'condition', config: { left: '{{event_name}}', op: 'eq', right: 'messaging.message_sent' }, on_true: 'step_2', on_false: 'step_3' },
    // { id: 'step_2', type: 'notify', config: { user_id: '{{actor_user_id}}', channel: 'in_app', title: 'Message sent', body: 'A message was sent.' } },
    // { id: 'step_3', type: 'noop', config: {} },
  ],
};

const STEP_TYPES = [
  { value: 'create_entity', label: 'Create entity' },
  { value: 'update_entity', label: 'Update entity' },
  { value: 'condition', label: 'Condition (branch)' },
  { value: 'notify', label: 'Notify (in-app)' },
  { value: 'noop', label: 'No-op' },
];

function safeJson(str, fallback) {
  try {
    const p = JSON.parse(str);
    return p ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AdminWorkflows() {
  const { data: scope } = useTenantScope();
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;

  const { data: workflows, refetch } = useQuery({
    queryKey: ['workflow_definitions', districtId, schoolId],
    enabled: Boolean(scope),
    queryFn: async () => {
      const query = `query Workflows($districtId: uuid, $schoolId: uuid) {
        workflow_definitions(
          order_by: { updated_at: desc }
          where: {
            _and: [
              { _or: [ { district_id: { _is_null: true } }, { district_id: { _eq: $districtId } } ] }
              { _or: [ { school_id: { _is_null: true } }, { school_id: { _eq: $schoolId } } ] }
            ]
          }
        ) {
          id
          name
          status
          version
          pinned_version
          trigger
          definition
          created_by
          updated_at
        }
      }`;

      const { data, error } = await graphql.request(query, { districtId, schoolId });
      if (error) throw error;
      return data.workflow_definitions;
    },
  });

  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(() => {
    return workflows?.find((w) => w.id === selectedId) ?? workflows?.[0] ?? null;
  }, [workflows, selectedId]);

  const { data: versions } = useQuery({
    queryKey: ['workflow_definition_versions', selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const query = `query Versions($workflowId: uuid!) {
        workflow_definition_versions(
          where: { workflow_id: { _eq: $workflowId } }
          order_by: { version: desc }
        ) {
          id
          version
          created_at
          created_by
          trigger
          definition
        }
      }`;
      const { data, error } = await graphql.request(query, { workflowId: selected.id });
      if (error) throw error;
      return data.workflow_definition_versions;
    },
  });

  const [draftName, setDraftName] = useState('');
  const [draftStatus, setDraftStatus] = useState('active');
  const [draftTrigger, setDraftTrigger] = useState(JSON.stringify(DEFAULT_TRIGGER, null, 2));
  const [draftDefinition, setDraftDefinition] = useState(JSON.stringify(DEFAULT_DEF, null, 2));
  const [draftPinnedVersion, setDraftPinnedVersion] = useState('');
  const [activeTab, setActiveTab] = useState('visual');
  const [runDialog, setRunDialog] = useState({ open: false, run: null, steps: [] });

  // keep editor in sync when selection changes
  useMemo(() => {
    if (!selected) return;
    setDraftName(selected.name ?? '');
    setDraftStatus(selected.status ?? 'active');
    setDraftTrigger(JSON.stringify(selected.trigger ?? DEFAULT_TRIGGER, null, 2));
    setDraftDefinition(JSON.stringify(selected.definition ?? DEFAULT_DEF, null, 2));
    setDraftPinnedVersion(selected.pinned_version != null ? String(selected.pinned_version) : '');
  }, [selected?.id]);

  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ['workflow_runs', selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const query = `query Runs($workflowId: uuid!) {
        workflow_runs(where: { workflow_id: { _eq: $workflowId } }, order_by: { started_at: desc }, limit: 25) {
          id
          status
          started_at
          finished_at
          input
          output
        }
      }`;
      const { data, error } = await graphql.request(query, { workflowId: selected.id });
      if (error) throw error;
      return data.workflow_runs;
    },
  });

  const openRun = async (run) => {
    const query = `query RunSteps($runId: uuid!) {
      workflow_run_steps(where: { run_id: { _eq: $runId } }, order_by: { created_at: asc }) {
        id
        step_key
        status
        input
        output
        created_at
      }
    }`;
    const { data, error } = await graphql.request(query, { runId: run.id });
    if (error) throw error;
    setRunDialog({ open: true, run, steps: data.workflow_run_steps || [] });
  };

  const replayRun = async (run) => {
    const eventName = run?.input?.event_name;
    const meta = run?.input?.event_metadata || {};
    if (!eventName) return;
    await trackEvent({
      eventName,
      metadata: { ...meta, replayed_from_run_id: run.id, replayed: true },
    });
    await refetchRuns();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trigger = safeJson(draftTrigger, DEFAULT_TRIGGER);
      const definition = safeJson(draftDefinition, DEFAULT_DEF);
      const pinned_version = draftPinnedVersion ? Number(draftPinnedVersion) : null;

      if (selected?.id) {
        const mutation = `mutation UpdateWorkflow($id: uuid!, $patch: workflow_definitions_set_input!) {
          update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $patch) { id }
        }`;
        const { error } = await graphql.request(mutation, {
          id: selected.id,
          patch: { name: draftName, status: draftStatus, trigger, definition, pinned_version },
        });
        if (error) throw error;
        await trackEvent({ eventName: 'workflow.updated', metadata: { workflow_id: selected.id } });
        return selected.id;
      }

      const insert = `mutation InsertWorkflow($object: workflow_definitions_insert_input!) {
        insert_workflow_definitions_one(object: $object) { id }
      }`;
      const { data, error } = await graphql.request(insert, {
        object: {
          name: draftName || 'Untitled workflow',
          status: draftStatus,
          trigger,
          definition,
          district_id: districtId,
          school_id: schoolId,
          version: 1,
          pinned_version: pinned_version,
        },
      });
      if (error) throw error;
      await trackEvent({ eventName: 'workflow.created', metadata: { workflow_id: data.insert_workflow_definitions_one.id } });
      return data.insert_workflow_definitions_one.id;
    },
    onSuccess: async (id) => {
      await refetch();
      setSelectedId(id);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (versionRow) => {
      if (!selected?.id) return;
      const mutation = `mutation Rollback($id: uuid!, $patch: workflow_definitions_set_input!) {
        update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $patch) { id version }
      }`;
      const { error } = await graphql.request(mutation, {
        id: selected.id,
        patch: {
          trigger: versionRow.trigger,
          definition: versionRow.definition,
        },
      });
      if (error) throw error;
      await trackEvent({
        eventName: 'workflow.rolled_back',
        metadata: { workflow_id: selected.id, restored_version: versionRow.version },
      });
    },
    onSuccess: async () => {
      await refetch();
    },
  });

  const createNew = () => {
    setSelectedId(null);
    setDraftName('');
    setDraftStatus('active');
    setDraftTrigger(JSON.stringify(DEFAULT_TRIGGER, null, 2));
    setDraftDefinition(JSON.stringify(DEFAULT_DEF, null, 2));
    setDraftPinnedVersion('');
    setActiveTab('visual');
  };

  const addStep = (type) => {
    const def = safeJson(draftDefinition, DEFAULT_DEF);
    const steps = Array.isArray(def.steps) ? def.steps : [];
    const id = `step_${steps.length + 1}`;
    const base = { id, type, config: {} };
    if (type === 'condition') {
      base.config = { left: '{{event_name}}', op: 'eq', right: 'some.event' };
      base.on_true = null;
      base.on_false = null;
    }
    steps.push(base);
    setDraftDefinition(JSON.stringify({ ...def, steps }, null, 2));
  };

  const simulateTrigger = async () => {
    const t = safeJson(draftTrigger, DEFAULT_TRIGGER);
    const name = t?.event_name || 'custom.event';
    await trackEvent({ eventName: name, metadata: { simulated: true, workflow_editor: true } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Event-triggered automation. This build supports real entity ops, branching, version pinning, and replay.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createNew}>New</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
          <Button variant="secondary" onClick={simulateTrigger}>Simulate trigger</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(workflows ?? []).map((w) => (
                <button
                  key={w.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selected?.id === w.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedId(w.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground">v{w.version}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{w.status}</div>
                </button>
              ))}
              {!workflows?.length && <div className="text-sm text-muted-foreground">No workflows yet.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g., Auto-create follow-up task" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={draftStatus} onValueChange={setDraftStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pinned version</label>
                <Select value={draftPinnedVersion} onValueChange={setDraftPinnedVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use latest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use latest</SelectItem>
                    {(versions ?? []).map((v) => (
                      <SelectItem key={v.id} value={String(v.version)}>
                        Pin v{v.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pinning runs the selected historical snapshot (useful for safe rollouts).
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trigger (JSON)</label>
                <Textarea value={draftTrigger} onChange={(e) => setDraftTrigger(e.target.value)} rows={6} />
              </div>
            </div>

            <div className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="mt-4">
                  <WorkflowGraphEditor
                    definitionJson={draftDefinition}
                    onChangeDefinitionJson={setDraftDefinition}
                  />
                </TabsContent>

                <TabsContent value="json" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Definition (JSON)</label>
                      <Select onValueChange={addStep}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Quick add" />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea value={draftDefinition} onChange={(e) => setDraftDefinition(e.target.value)} rows={14} />
                    <p className="text-xs text-muted-foreground">
                      v2 supports condition steps with <code>on_true</code>/<code>on_false</code> edges. Templates like{' '}
                      <code>{`{{event_metadata.thread_id}}`}</code> are resolved at runtime.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versions</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected?.id && <div className="text-sm text-muted-foreground">Select a workflow.</div>}
            {selected?.id && !versions?.length && <div className="text-sm text-muted-foreground">No versions yet.</div>}

            <div className="space-y-2">
              {(versions ?? []).slice(0, 10).map((v) => (
                <div key={v.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">v{v.version}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rollbackMutation.mutate(v)}
                      disabled={rollbackMutation.isPending || !selected?.id}
                    >
                      Restore
                    </Button>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {v.created_at ? new Date(v.created_at).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Restoring a version updates the live definition and auto-creates a new snapshot (audit-friendly).
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected?.id && <div className="text-sm text-muted-foreground">Select a workflow to see runs.</div>}
            {selected?.id && !runs?.length && <div className="text-sm text-muted-foreground">No runs yet.</div>}

            <div className="space-y-2">
              {(runs ?? []).map((r) => (
                <div key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{r.status}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.started_at ? new Date(r.started_at).toLocaleString() : ''}
                        {r.finished_at ? ` → ${new Date(r.finished_at).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openRun(r)}>View</Button>
                      <Button size="sm" variant="secondary" onClick={() => replayRun(r)}>Replay</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={runDialog.open} onOpenChange={(open) => setRunDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Workflow run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {runDialog.run && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{runDialog.run.id}</div>
                <div className="text-xs text-muted-foreground">Status: {runDialog.run.status}</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium mb-1">Input</div>
                    <Textarea value={JSON.stringify(runDialog.run.input || {}, null, 2)} readOnly rows={10} />
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Output</div>
                    <Textarea value={JSON.stringify(runDialog.run.output || {}, null, 2)} readOnly rows={10} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">Steps</div>
              {!runDialog.steps?.length && <div className="text-sm text-muted-foreground">No step rows.</div>}
              <div className="space-y-2">
                {(runDialog.steps || []).map((s) => (
                  <div key={s.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{s.step_key}</div>
                      <div className="text-xs text-muted-foreground">{s.status}</div>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium mb-1">Input</div>
                        <Textarea value={JSON.stringify(s.input || {}, null, 2)} readOnly rows={6} />
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">Output</div>
                        <Textarea value={JSON.stringify(s.output || {}, null, 2)} readOnly rows={6} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
