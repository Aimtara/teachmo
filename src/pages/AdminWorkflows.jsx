import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { trackEvent } from '@/observability/telemetry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_TRIGGER = { type: 'event', event_name: 'messaging.message_sent' };
const DEFAULT_DEF = { version: 1, steps: [] };

const STEP_TYPES = [
  { value: 'create_entity', label: 'Create entity' },
  { value: 'update_entity', label: 'Update entity' },
  { value: 'notify', label: 'Notify (stub)' },
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
          patch: { name: draftName, status: draftStatus, trigger, definition, updated_at: new Date().toISOString() },
        });
        if (error) throw error;
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
      return data.insert_workflow_definitions_one.id;
    },
    onSuccess: async (id) => {
      await refetch();
      setSelectedId(id);
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
    steps.push({ id, type, config: {} });
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
          <p className="text-sm text-muted-foreground">Event-triggered automation (Phase 5). Actions are recorded as intended operations; real execution is the next milestone.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createNew}>New</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
          <Button variant="secondary" onClick={simulateTrigger}>Simulate trigger</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Trigger (JSON)</label>
                </div>
                <Textarea value={draftTrigger} onChange={(e) => setDraftTrigger(e.target.value)} rows={8} />
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
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea value={draftDefinition} onChange={(e) => setDraftDefinition(e.target.value)} rows={8} />
                <p className="text-xs text-muted-foreground">Steps are recorded into workflow_runs/workflow_run_steps; action execution is stubbed for now.</p>
              </div>
            </div>

            <div className="mt-6">
              <Button variant="outline" onClick={refetch}>Refresh list</Button>
              {saveMutation.isError && (
                <div className="mt-2 text-sm text-destructive">Save failed: {String(saveMutation.error?.message || saveMutation.error)}</div>
              )}
              {saveMutation.isSuccess && <div className="mt-2 text-sm text-muted-foreground">Saved.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
