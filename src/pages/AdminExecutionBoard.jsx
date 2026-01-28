import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addExecutionDependency,
  createOrchestratorAction,
  createExecutionSlice,
  deleteExecutionSlice,
  exportExecutionBoardCsv,
  getExecutionBoard,
  listExecutionAudit,
  listOrchestratorActions,
  removeExecutionDependency,
  updateExecutionEpic,
  updateExecutionGate,
  updateExecutionSlice
} from '@/domains/executionBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const EPIC_STATUSES = ['Backlog', 'In Progress', 'Blocked', 'Done'];
const SLICE_STATUSES = ['Backlog', 'In Progress', 'Blocked', 'Done'];
const WIP_LIMIT = 5;

function statusVariant(status) {
  const s = String(status).toLowerCase();
  if (s === 'done') return 'secondary';
  if (s === 'blocked') return 'destructive';
  if (s === 'in progress') return 'default';
  return 'outline';
}

function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row?.[c])).join(','));
  return [header, ...lines].join('\n');
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function GateChecklistEditor({ gate, onSave }) {
  const [items, setItems] = useState(gate.checklist ?? []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Checklist</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{gate.gate} checklist</DialogTitle>
          <DialogDescription>{gate.purpose}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="flex items-start gap-3">
              <Checkbox
                checked={Boolean(item.done)}
                onCheckedChange={(checked) => {
                  const next = items.slice();
                  next[idx] = { ...item, done: Boolean(checked) };
                  setItems(next);
                }}
              />
              <div className="text-sm leading-5">
                <div className="font-medium">{item.id}</div>
                <div className="text-gray-600">{item.text}</div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onSave(items)}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDependencyDialog({ epics, slices, onAdd }) {
  const [fromKind, setFromKind] = useState('epic');
  const [fromId, setFromId] = useState('');
  const [toKind, setToKind] = useState('epic');
  const [toId, setToId] = useState('');

  const optionsByKind = (kind) => (kind === 'slice' ? slices : epics);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add dependency</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add “blocks” dependency</DialogTitle>
          <DialogDescription>
            Creates a blocking edge: <span className="font-mono">from → to</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">From kind</div>
            <select className="w-full border rounded px-2 py-2" value={fromKind} onChange={(e) => { setFromKind(e.target.value); setFromId(''); }}>
              <option value="epic">epic</option>
              <option value="slice">slice</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">From id</div>
            <select className="w-full border rounded px-2 py-2" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Select…</option>
              {optionsByKind(fromKind).map((o) => (
                <option key={o.id} value={o.id}>{o.id} — {o.workstream || o.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-500">To kind</div>
            <select className="w-full border rounded px-2 py-2" value={toKind} onChange={(e) => { setToKind(e.target.value); setToId(''); }}>
              <option value="epic">epic</option>
              <option value="slice">slice</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">To id</div>
            <select className="w-full border rounded px-2 py-2" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Select…</option>
              {optionsByKind(toKind).map((o) => (
                <option key={o.id} value={o.id}>{o.id} — {o.workstream || o.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              if (!fromId || !toId) return;
              onAdd({ fromKind, fromId, toKind, toId, relation: 'blocks' });
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SliceEditorDialog({ initial, onSave }) {
  const [draft, setDraft] = useState(initial ?? {
    id: '',
    name: '',
    status: 'Backlog',
    ownerRole: '',
    gate: '',
    primaryEpicId: '',
    summary: '',
    acceptance: ''
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{initial ? 'Edit' : 'New slice'}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.id}` : 'Create slice'}</DialogTitle>
          <DialogDescription>Thin vertical slice that ships end-to-end value.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">ID</div>
            <Input disabled={Boolean(initial)} value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="S06" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Status</div>
            <select className="w-full border rounded px-2 py-2" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {SLICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <div className="text-xs text-gray-500">Name</div>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Roster import v0" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Gate</div>
            <Input value={draft.gate} onChange={(e) => setDraft({ ...draft, gate: e.target.value })} placeholder="G2" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Primary epic</div>
            <Input value={draft.primaryEpicId} onChange={(e) => setDraft({ ...draft, primaryEpicId: e.target.value })} placeholder="E04" />
          </div>
          <div className="space-y-1 col-span-2">
            <div className="text-xs text-gray-500">Summary</div>
            <Input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="What this slice delivers end-to-end" />
          </div>
          <div className="space-y-1 col-span-2">
            <div className="text-xs text-gray-500">Acceptance</div>
            <Input value={draft.acceptance} onChange={(e) => setDraft({ ...draft, acceptance: e.target.value })} placeholder="How we know it works" />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onSave(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminExecutionBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const boardQuery = useQuery({
    queryKey: ['execution-board'],
    queryFn: getExecutionBoard
  });

  const auditQuery = useQuery({
    queryKey: ['execution-board-audit'],
    queryFn: () => listExecutionAudit({ limit: 200 }),
    enabled: false
  });

  const orchestratorQuery = useQuery({
    queryKey: ['execution-board-orchestrator'],
    queryFn: () => listOrchestratorActions({ limit: 100 }),
    enabled: false
  });

  const board = boardQuery.data;
  const epics = board?.epics ?? [];
  const gates = board?.gates ?? [];
  const slices = board?.slices ?? [];
  const dependencies = board?.dependencies ?? [];

  const railPriorityCount = epics.filter((e) => Boolean(e.railPriority)).length;
  const wipOverLimit = railPriorityCount > WIP_LIMIT;

  const filteredEpics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return epics;
    return epics.filter((e) =>
      `${e.id} ${e.workstream} ${e.tag} ${e.railSegment}`.toLowerCase().includes(q)
    );
  }, [epics, search]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['execution-board'] });
  }

  async function safe(fn, successTitle, successDescription = 'Saved.') {
    try {
      await fn();
      toast({ title: successTitle, description: successDescription });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive'
      });
    }
  }

  if (boardQuery.isLoading) {
    return <div className="p-6 text-gray-600">Loading execution board…</div>;
  }

  if (boardQuery.isError) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Execution Board</h1>
        <p className="text-red-700 text-sm">{boardQuery.error?.message || 'Failed to load.'}</p>
        <p className="text-gray-600 text-sm">
          This page requires Postgres env vars in <span className="font-mono">backend/.env</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Execution Board</h1>
            <p className="text-gray-600">
              One board to rule the chaos. Gates → slices → shippable outcomes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
            <Button
              variant="outline"
              onClick={() => safe(async () => {
                await exportExecutionBoardCsv('epics');
              }, 'Export started', 'Download started.')}
            >
              Export epics (CSV)
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-600">Rail priorities</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{railPriorityCount} / {WIP_LIMIT}</div>
              {wipOverLimit ? (
                <p className="text-sm text-red-700 mt-1">Over limit. Trim priorities to reduce thrash.</p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">Keep it small so it actually ships.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-600">Gates</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{gates.filter((g) => g.status === 'Done').length} / {gates.length}</div>
              <p className="text-sm text-gray-600 mt-1">Each gate is a mini-release with a checklist.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-gray-600">Slices</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{slices.filter((s) => s.status === 'Done').length} / {slices.length}</div>
              <p className="text-sm text-gray-600 mt-1">Thin vertical slices are how the sausage ships.</p>
            </CardContent>
          </Card>
        </div>
      </header>

      <Tabs defaultValue="epics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="epics">Epics</TabsTrigger>
          <TabsTrigger value="gates">Gates</TabsTrigger>
          <TabsTrigger value="slices">Slices</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="audit" onClick={() => auditQuery.refetch()}>Audit</TabsTrigger>
          <TabsTrigger value="ops" onClick={() => orchestratorQuery.refetch()}>Ops</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="epics" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Input placeholder="Search epics…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            <Button
              variant="outline"
              onClick={() => safe(async () => { await exportExecutionBoardCsv('epics'); }, 'Export started', 'Download started.')}
            >
              Export (backend CSV)
            </Button>
          </div>

          <div className="rounded border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Workstream</TableHead>
                  <TableHead className="w-[140px]">Tag</TableHead>
                  <TableHead className="w-[160px]">Rail</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[140px]">Priority</TableHead>
                  <TableHead className="w-[140px]">Ops</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEpics.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.id}</TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {e.workstream}
                        {e.blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : null}
                      </div>
                      {e.blocked && e.blockers?.length ? (
                        <div className="text-xs text-gray-600">Blockers: {e.blockers.join(', ')}</div>
                      ) : null}
                      <div className="text-xs text-gray-600">Gates: {(e.gates || []).join(', ')}</div>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(e.tag)}>{e.tag}</Badge></TableCell>
                    <TableCell>{e.railSegment}</TableCell>
                    <TableCell>
                      <select
                        className="w-full border rounded px-2 py-2"
                        value={e.status}
                        onChange={(evt) => {
                          const status = evt.target.value;
                          safe(async () => {
                            await updateExecutionEpic(e.id, { status }, 'system_admin');
                            await refresh();
                          }, `Epic ${e.id} updated`);
                        }}
                      >
                        {EPIC_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(e.railPriority)}
                          onCheckedChange={(checked) => {
                            const enabling = Boolean(checked) && !e.railPriority;
                            const current = railPriorityCount;

                            if (enabling && current >= WIP_LIMIT) {
                              toast({
                                title: 'WIP limit reached',
                                description: `You already have ${current} rail priorities. Finish something before adding more.`,
                                variant: 'destructive'
                              });
                              return;
                            }

                            safe(async () => {
                              await updateExecutionEpic(e.id, { railPriority: Boolean(checked) }, 'system_admin');
                              await refresh();
                            }, `Rail priority updated`);
                          }}
                        />
                        <span className="text-xs text-gray-600">{e.railPriority ? 'On' : 'Off'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => safe(async () => {
                              await createOrchestratorAction({
                                actionType: 'RUNBOOK_CREATE',
                                entityType: 'epic',
                                entityId: e.id,
                                payload: { workstream: e.workstream, tag: e.tag }
                              }, 'system_admin');
                            }, 'Runbook queued')}
                          >
                            Create runbook
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => safe(async () => {
                              await createOrchestratorAction({
                                actionType: 'ESCALATE',
                                entityType: 'epic',
                                entityId: e.id,
                                payload: { reason: 'needs attention', blockers: e.blockers ?? [] }
                              }, 'system_admin');
                            }, 'Escalation queued')}
                          >
                            Escalate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => safe(async () => {
                              await createOrchestratorAction({
                                actionType: 'ROLLBACK',
                                entityType: 'epic',
                                entityId: e.id,
                                payload: { hint: 'Feature-flag rollback or revert deploy' }
                              }, 'system_admin');
                            }, 'Rollback queued')}
                          >
                            Rollback
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="gates" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Auto-completion: when every checklist item is checked, the gate flips to <span className="font-semibold">Done</span>.</div>
            <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('gates'); }, 'Export started', 'Download started.')}>Export gates (CSV)</Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            {gates.map((g) => (
              <Card key={g.gate}>
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{g.gate}</CardTitle>
                    <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">{g.purpose}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={g.progress} />
                  <div className="text-xs text-gray-600">{g.progress}% complete</div>
                  <GateChecklistEditor
                    gate={g}
                    onSave={(items) => {
                      safe(async () => {
                        await updateExecutionGate(g.gate, { checklist: items }, 'system_admin');
                        await refresh();
                      }, `${g.gate} checklist saved`);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slices" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Slices are end-to-end shippable outcomes.</div>
            <div className="flex gap-2">
              <SliceEditorDialog
                onSave={(draft) => safe(async () => {
                  await createExecutionSlice(draft, 'system_admin');
                  await refresh();
                }, 'Slice created')}
              />
              <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('slices'); }, 'Export started', 'Download started.')}>Export slices (CSV)</Button>
            </div>
          </div>
          <div className="rounded border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Gate</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[160px]">Primary epic</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slices.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.summary ? <div className="text-xs text-gray-600">{s.summary}</div> : null}
                    </TableCell>
                    <TableCell>{s.gate}</TableCell>
                    <TableCell><Badge variant={statusVariant(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell className="font-mono">{s.primaryEpicId}</TableCell>
                    <TableCell className="flex gap-2">
                      <SliceEditorDialog
                        initial={s}
                        onSave={(draft) => safe(async () => {
                          await updateExecutionSlice(s.id, draft, 'system_admin');
                          await refresh();
                        }, 'Slice updated')}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => safe(async () => {
                          await deleteExecutionSlice(s.id, 'system_admin');
                          await refresh();
                        }, 'Slice deleted')}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Dependencies drive blocked status and rail sequencing.</div>
            <div className="flex gap-2">
              <AddDependencyDialog
                epics={epics}
                slices={slices}
                onAdd={(dep) => safe(async () => {
                  await addExecutionDependency(dep, 'system_admin');
                  await refresh();
                }, 'Dependency added')}
              />
              <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('dependencies'); }, 'Export started', 'Download started.')}>Export dependencies (CSV)</Button>
            </div>
          </div>
          <div className="rounded border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="w-[140px]">Relation</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencies.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.id}</TableCell>
                    <TableCell className="font-mono">{d.fromKind}:{d.fromId}</TableCell>
                    <TableCell className="font-mono">{d.toKind}:{d.toId}</TableCell>
                    <TableCell><Badge variant="outline">{d.relation}</Badge></TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => safe(async () => {
                          await removeExecutionDependency(d.id, 'system_admin');
                          await refresh();
                        }, 'Dependency removed')}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Append-only record of changes to the board.</div>
            <Button
              variant="outline"
              onClick={() => {
                const rows = auditQuery.data?.rows ?? [];
                const csv = toCsv(rows, ['id', 'entityType', 'entityId', 'action', 'actor', 'createdAt', 'before', 'after']);
                downloadCsv('execution_audit.csv', csv);
              }}
            >
              Export audit (CSV)
            </Button>
          </div>
          <div className="rounded border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">ID</TableHead>
                  <TableHead className="w-[120px]">Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[160px]">Actor</TableHead>
                  <TableHead className="w-[220px]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditQuery.data?.rows ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.id}</TableCell>
                    <TableCell className="font-mono">{r.entityType}:{r.entityId}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.actor || '—'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ops" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Orchestrator hooks (currently queued actions + auditability).</div>
            <Button
              variant="outline"
              onClick={() => {
                const rows = orchestratorQuery.data?.rows ?? [];
                const csv = toCsv(rows, ['id', 'actionType', 'entityType', 'entityId', 'requestedBy', 'status', 'createdAt', 'payload', 'result']);
                downloadCsv('orchestrator_actions.csv', csv);
              }}
            >
              Export ops (CSV)
            </Button>
          </div>
          <div className="rounded border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[200px]">Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orchestratorQuery.data?.rows ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.id}</TableCell>
                    <TableCell className="font-mono">{r.actionType}</TableCell>
                    <TableCell className="font-mono">{r.entityType}:{r.entityId}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="exports" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Export options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Two export modes: <span className="font-semibold">backend CSV</span> (hits the API) or <span className="font-semibold">local CSV</span> (exports the exact data you’re viewing).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('epics'); }, 'Export started', 'Download started.')}>Backend: Epics</Button>
                <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('gates'); }, 'Export started', 'Download started.')}>Backend: Gates</Button>
                <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('slices'); }, 'Export started', 'Download started.')}>Backend: Slices</Button>
                <Button variant="outline" onClick={() => safe(async () => { await exportExecutionBoardCsv('dependencies'); }, 'Export started', 'Download started.')}>Backend: Dependencies</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const csv = toCsv(epics, ['id', 'workstream', 'tag', 'railSegment', 'ownerRole', 'status', 'blocked', 'blockers', 'gates', 'railPriority', 'dod', 'notes']);
                    downloadCsv('execution_epics_local.csv', csv);
                  }}
                >
                  Local: Epics
                </Button>
                <Button
                  onClick={() => {
                    const csv = toCsv(gates, ['gate', 'purpose', 'status', 'progress', 'checklist', 'updatedAt']);
                    downloadCsv('execution_gates_local.csv', csv);
                  }}
                >
                  Local: Gates
                </Button>
                <Button
                  onClick={() => {
                    const csv = toCsv(slices, ['id', 'name', 'status', 'ownerRole', 'gate', 'primaryEpicId', 'summary', 'acceptance', 'updatedAt']);
                    downloadCsv('execution_slices_local.csv', csv);
                  }}
                >
                  Local: Slices
                </Button>
                <Button
                  onClick={() => {
                    const csv = toCsv(dependencies, ['id', 'fromKind', 'fromId', 'toKind', 'toId', 'relation', 'createdAt']);
                    downloadCsv('execution_dependencies_local.csv', csv);
                  }}
                >
                  Local: Dependencies
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
