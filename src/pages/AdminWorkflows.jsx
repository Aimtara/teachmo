import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createWorkflow, deleteWorkflow, listWorkflows, updateWorkflow } from '@/api/workflows/client';
import WorkflowBuilder from '@/components/admin/workflows/WorkflowBuilder';

function defaultDefinition() {
  const triggerId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  return {
    nodes: [
      { id: triggerId, type: 'trigger', position: { x: 50, y: 50 }, data: { label: 'Trigger', config: { type: 'manual' } } },
      { id: actionId, type: 'action', position: { x: 320, y: 50 }, data: { label: 'Action', config: { type: 'create_entity', entity: 'Note', fields: { title: '{{trigger.title}}' } } } },
    ],
    edges: [{ id: crypto.randomUUID(), source: triggerId, target: actionId, type: 'smoothstep' }],
  };
}

export default function AdminWorkflows() {
  const { isAuthenticated } = useAuthenticationStatus();
  const tenant = useTenant();
  const { toast } = useToast();

  const scope = useMemo(
    () => ({ organizationId: tenant.organizationId || '', schoolId: tenant.schoolId || null }),
    [tenant.organizationId, tenant.schoolId]
  );

  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const selected = workflows.find((w) => w.id === selectedId) || null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tenant.loading) return;
    if (!scope.organizationId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await listWorkflows(scope);
        if (!mounted) return;
        setWorkflows(res.workflows || []);
        if (!selectedId && res.workflows?.length) setSelectedId(res.workflows[0].id);
      } catch (err) {
        toast({ title: 'Failed to load workflows', description: String(err) });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAuthenticated, tenant.loading, scope.organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    setName(selected.name || '');
    setDescription(selected.description || '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (tenant.loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading tenant…</div>;
  if (!scope.organizationId) return <div className="p-6 text-center text-sm text-destructive">Missing tenant scope.</div>;

  async function handleCreate() {
    try {
      const res = await createWorkflow(scope, { name: 'New Workflow', description: '', definition: defaultDefinition(), is_active: true });
      const wf = res.workflow;
      setWorkflows((prev) => [wf, ...prev]);
      setSelectedId(wf.id);
      toast({ title: 'Workflow created' });
    } catch (err) {
      toast({ title: 'Create failed', description: String(err) });
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteWorkflow(scope, selected.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== selected.id));
      setSelectedId(null);
      toast({ title: 'Workflow deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err) });
    }
  }

  async function handleMetaSave() {
    if (!selected) return;
    try {
      const res = await updateWorkflow(scope, selected.id, { name, description });
      setWorkflows((prev) => prev.map((w) => (w.id === selected.id ? res.workflow : w)));
      toast({ title: 'Saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err) });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Builder</h1>
          <p className="text-sm text-muted-foreground">No-code, tenant-scoped automation with multi-step actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCreate}>New workflow</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!selected}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">Workflows</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : workflows.length ? (
              <div className="space-y-2">
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    className={cn('w-full text-left rounded-md border p-2 hover:bg-muted transition', wf.id === selectedId && 'border-primary bg-muted')}
                    onClick={() => setSelectedId(wf.id)}
                  >
                    <div className="text-sm font-medium truncate">{wf.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{wf.description || '—'}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No workflows yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-9">
          <CardHeader><CardTitle className="text-base">Design</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Select a workflow to edit.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleMetaSave}>Save details</Button>
                </div>

                <WorkflowBuilder
                  workflow={selected}
                  scope={scope}
                  onChange={async (nextDefinition) => {
                    setWorkflows((prev) => prev.map((w) => (w.id === selected.id ? { ...w, definition: nextDefinition } : w)));
                    try {
                      const res = await updateWorkflow(scope, selected.id, { definition: nextDefinition });
                      setWorkflows((prev) => prev.map((w) => (w.id === selected.id ? res.workflow : w)));
                    } catch (err) {
                      toast({ title: 'Save failed', description: String(err) });
                    }
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
