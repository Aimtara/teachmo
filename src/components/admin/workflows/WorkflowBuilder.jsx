import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { addEdge, Background, Controls, Handle, MiniMap, Position, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { runWorkflow } from '@/api/workflows/client';
import { useToast } from '@/hooks/use-toast';

const ACTION_TYPES = [
  { value: 'send_message', label: 'Send message' },
  { value: 'create_entity', label: 'Create entity' },
  { value: 'update_entity', label: 'Update entity' },
];

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual trigger' },
  { value: 'message_sent', label: 'Message sent' },
  { value: 'ai_high_risk', label: 'AI high risk' },
];

function NodeShell({ title, subtitle, selected, children }) {
  return (
    <div className={cn('rounded-lg border bg-background px-3 py-2 shadow-sm min-w-[180px]', selected && 'border-primary')}>
      <div className="text-xs font-semibold">{title}</div>
      {subtitle ? <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TriggerNode({ data, selected }) {
  return (
    <NodeShell title="Trigger" subtitle={data?.config?.type} selected={selected}>
      <Handle type="source" position={Position.Right} />
      <div className="text-[11px] text-muted-foreground">Starts the workflow.</div>
    </NodeShell>
  );
}

function ActionNode({ data, selected }) {
  return (
    <NodeShell title="Action" subtitle={data?.config?.type} selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-[11px] text-muted-foreground">Runs an operation.</div>
    </NodeShell>
  );
}

const nodeTypes = { trigger: TriggerNode, action: ActionNode };

function keyValueToPairs(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([k, v]) => ({ key: k, value: v }));
}
function pairsToObject(pairs) {
  const out = {};
  for (const p of pairs) {
    if (!p.key) continue;
    out[p.key] = p.value;
  }
  return out;
}

function Inspector({ node, setNodeConfig }) {
  const type = node?.type;
  const cfg = node?.data?.config || {};
  const [pairs, setPairs] = useState(() => keyValueToPairs(cfg.fields));
  useEffect(() => { setPairs(keyValueToPairs(cfg.fields)); }, [node?.id]); // sync on selection change

  if (!node) return <div className="text-sm text-muted-foreground">Select a node to edit.</div>;

  if (type === 'trigger') {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Trigger type</Label>
          <Select value={cfg.type || 'manual'} onValueChange={(v) => setNodeConfig({ ...cfg, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold">Available variables</div>
          <div className="text-[11px] text-muted-foreground mt-1">Use <span className="font-mono">{'{{trigger.*}}'}</span> in mappings.</div>
          <div className="mt-2 text-[11px] font-mono text-muted-foreground">trigger.title, trigger.body, trigger.childId, trigger.role, trigger.meta.*</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Action type</Label>
        <Select value={cfg.type || 'create_entity'} onValueChange={(v) => setNodeConfig({ ...cfg, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(cfg.type === 'create_entity' || cfg.type === 'update_entity') ? (
        <div className="space-y-2">
          <Label>Entity name</Label>
          <Input value={cfg.entity || ''} onChange={(e) => setNodeConfig({ ...cfg, entity: e.target.value })} />
        </div>
      ) : null}

      {cfg.type === 'send_message' ? (
        <div className="space-y-2">
          <Label>Message template</Label>
          <Textarea rows={4} value={cfg.body || ''} onChange={(e) => setNodeConfig({ ...cfg, body: e.target.value })} />
        </div>
      ) : null}

      {(cfg.type === 'create_entity' || cfg.type === 'update_entity') ? (
        <div className="space-y-2">
          <Label>Field mapping</Label>
          <div className="space-y-2">
            {pairs.map((p, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="field"
                  value={p.key}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...next[idx], key: e.target.value };
                    setPairs(next);
                    setNodeConfig({ ...cfg, fields: pairsToObject(next) });
                  }}
                />
                <Input
                  placeholder="value (e.g. {{trigger.title}})"
                  value={p.value}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...next[idx], value: e.target.value };
                    setPairs(next);
                    setNodeConfig({ ...cfg, fields: pairsToObject(next) });
                  }}
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={() => setPairs((p) => [...p, { key: '', value: '' }])}>Add field</Button>
          <div className="text-[11px] text-muted-foreground">
            Values may reference <span className="font-mono">{'{{trigger.*}}'}</span> or <span className="font-mono">{'{{steps.<nodeId>.*}}'}</span>.
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowBuilder({ workflow, onChange, scope }) {
  const { toast } = useToast();
  const initial = workflow?.definition || { nodes: [], edges: [] };

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const definition = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type) => {
    const id = crypto.randomUUID();
    const config = type === 'trigger'
      ? { type: 'manual' }
      : { type: 'create_entity', entity: 'Note', fields: { title: '{{trigger.title}}' } };
    setNodes((ns) => [...ns, { id, type, position: { x: 120 + ns.length * 40, y: 80 + ns.length * 30 }, data: { label: type, config } }]);
  }, [setNodes]);

  const setNodeConfig = useCallback((config) => {
    if (!selectedNodeId) return;
    setNodes((ns) => ns.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n)));
  }, [selectedNodeId, setNodes]);

  const handleSave = useCallback(() => {
    onChange?.(definition);
    toast({ title: 'Saved workflow graph' });
  }, [definition, onChange, toast]);

  const handleRun = useCallback(async () => {
    if (!workflow?.id) return;
    try {
      const res = await runWorkflow(scope, workflow.id, { trigger: { title: 'Test event', body: 'Sample payload', childId: 'demo-child', role: 'teacher', meta: { source: 'ui' } } });
      toast({ title: 'Run recorded', description: `Steps: ${Object.keys(res.execution?.steps || {}).length}` });
    } catch (err) {
      toast({ title: 'Run failed', description: String(err) });
    }
  }, [workflow?.id, scope, toast]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => addNode('action')}>Add action</Button>
            <Button variant="secondary" onClick={() => addNode('trigger')}>Add trigger</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleRun}>Test run</Button>
            <Button onClick={handleSave}>Save graph</Button>
          </div>
        </div>

        <div className="h-[520px] rounded-lg border overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedNodeId(n.id)}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>

      <div className="lg:col-span-4">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Inspector</div>
          <Inspector node={selectedNode} setNodeConfig={setNodeConfig} />
        </Card>

        <Card className="p-4 mt-4">
          <div className="text-sm font-semibold mb-2">Definition (read-only)</div>
          <pre className="text-[10px] bg-muted rounded p-3 overflow-auto max-h-[240px]">
            {JSON.stringify(definition, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
