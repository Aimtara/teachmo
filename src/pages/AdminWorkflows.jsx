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

  // keep editor in sync when selection changes
  useMemo(() => {
    if (!selected) return;
    setDraftName(selected.name ?? '');
    setDraftStatus(selected.status ?? 'active');
    setDraftTrigger(JSON.stringify(selected.trigger ?? DEFAULT_TRIGGER, null, 2));
    setDraftDefinition(JSON.stringify(selected.definition ?? DEFAULT_DEF, null, 2));
  }, [selected?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trigger = safeJson(draftTrigger, DEFAULT_TRIGGER);
      const definition = safeJson(draftDefinition, DEFAULT_DEF);

      if (selected?.id) {
        const mutation = `mutation UpdateWorkflow($id: uuid!, $patch: workflow_definitions_set_input!) {
          update_workflow_definitions_by_pk(pk_columns: { id: $id }, _set: $patch) { id }
        }`;
        const { error } = await graphql.request(mutation, {
          id: selected.id,
          patch: { name: draftName, status: draftStatus, trigger, definition },
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
            Event-triggered automation. Phase 6 adds real action execution, branching, and rollback/version controls.
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

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Trigger (JSON)</label>
                <Textarea value={draftTrigger} onChange={(e) => setDraftTrigger(e.target.value)} rows={10} />
                <p className="text-xs text-muted-foreground">Use <code>{`{ "type": "event", "event_name": "messaging.message_sent" }`}</code>.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Definition (JSON)</label>
                  <div className="flex gap-2">
                    <Select onValueChange={addStep}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Add step" />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea value={draftDefinition} onChange={(e) => setDraftDefinition(e.target.value)} rows={10} />
                <p className="text-xs text-muted-foreground">
                  v2 supports condition steps with <code>on_true</code>/<code>on_false</code> edges. Templates like{' '}
                  <code>{`{{event_metadata.thread_id}}`}</code> are resolved at runtime.
                </p>
              </div>
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
      </div>
    </div>
  );
}
