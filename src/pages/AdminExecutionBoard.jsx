import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

const TAGS = ['All', 'MVP shipping', 'Pilot hardening', 'Enterprise scale', 'R&D'];
const STATUSES = ['All', 'Backlog', 'Planned', 'In progress', 'Done'];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}

function statusBadgeVariant(status) {
  if (status === 'Done') return 'default';
  if (status === 'In progress') return 'secondary';
  return 'outline';
}

export default function AdminExecutionBoard() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');
  const [segment, setSegment] = useState('All');
  const [status, setStatus] = useState('All');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/board`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBoard(data);
    } catch (e) {
      setError(e?.message || 'Failed to load execution board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const segments = useMemo(() => {
    if (!board?.epics) return ['All'];
    return ['All', ...unique(board.epics.map((e) => e.railSegment))];
  }, [board]);

  const stats = useMemo(() => {
    const empty = { backlog: 0, planned: 0, inProgress: 0, done: 0, blocked: 0 };
    if (!board?.epics) return empty;
    return board.epics.reduce((acc, e) => {
      if (e.status === 'Backlog') acc.backlog += 1;
      else if (e.status === 'Planned') acc.planned += 1;
      else if (e.status === 'In progress') acc.inProgress += 1;
      else if (e.status === 'Done') acc.done += 1;
      if (e.blocked) acc.blocked += 1;
      return acc;
    }, { ...empty });
  }, [board]);

  const filteredEpics = useMemo(() => {
    if (!board?.epics) return [];
    const q = search.trim().toLowerCase();
    return board.epics
      .filter((e) => (tag === 'All' ? true : e.tag === tag))
      .filter((e) => (segment === 'All' ? true : e.railSegment === segment))
      .filter((e) => (status === 'All' ? true : e.status === status))
      .filter((e) => {
        if (!q) return true;
        const hay = `${e.id} ${e.workstream} ${e.ownerRole} ${e.nextMilestone} ${e.notes}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }, [board, search, tag, segment, status]);

  const updateEpic = async (id, patch) => {
    // Minimal “save” that always returns the refreshed board.
    const res = await fetch(`${API_BASE_URL}/execution-board/epics/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard(await res.json());
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Execution board</h1>
        <p className="text-gray-600">
          One place to see gates → epics → slices → dependency blockers.
          {board?.updatedAt ? ` Updated ${new Date(board.updatedAt).toLocaleString()}.` : ''}
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-start justify-between gap-3">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            className="text-red-700 hover:text-red-900 text-xs font-medium"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Backlog</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.backlog}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.planned}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.inProgress}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Done</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.done}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.blocked}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gate progress</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(board?.gates || []).map((g) => (
            <div key={g.gate} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{g.gate}</div>
                <Badge variant={statusBadgeVariant(g.status)}>{g.status}</Badge>
              </div>
              <div className="text-xs text-gray-600">{g.purpose}</div>
              <Progress value={Math.round((g.progress || 0) * 100)} />
              <div className="text-xs text-gray-600">
                {g.checked ?? 0}/{g.total ?? 0} checklist items
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Epics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Search epics…" value={search} onChange={(e) => setSearch(e.target.value)} />

            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                {TAGS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue placeholder="Rail segment" />
              </SelectTrigger>
              <SelectContent>
                {segments.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Workstream</TableHead>
                  <TableHead className="w-[140px]">Tag</TableHead>
                  <TableHead className="w-[140px]">Segment</TableHead>
                  <TableHead className="w-[160px]">Owner</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[120px]">Blocked</TableHead>
                  <TableHead className="w-[130px]">Rail priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-600">Loading…</TableCell>
                  </TableRow>
                ) : filteredEpics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-600">No epics match your filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredEpics.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-sm">{e.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{e.workstream}</div>
                        {e.nextMilestone ? (
                          <div className="text-xs text-gray-600 line-clamp-2">{e.nextMilestone}</div>
                        ) : null}
                      </TableCell>
                      <TableCell><Badge variant="outline">{e.tag}</Badge></TableCell>
                      <TableCell>{e.railSegment}</TableCell>
                      <TableCell className="text-sm text-gray-700">{e.ownerRole}</TableCell>
                      <TableCell>
                        <Select
                          value={e.status}
                          onValueChange={async (value) => {
                            try {
                              await updateEpic(e.id, { status: value });
                            } catch (err) {
                              setError(err?.message || 'Failed to update status');
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.filter((s) => s !== 'All').map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {e.blocked ? (
                          <div className="text-xs text-red-700">
                            Blocked by {e.blockedBy?.join(', ') || 'unknown'}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">—</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(e.railPriority)}
                            onCheckedChange={async (checked) => {
                              try {
                                await updateEpic(e.id, { railPriority: checked });
                              } catch (err) {
                                setError(err?.message || 'Failed to update rail priority');
                              }
                            }}
                          />
                          <span className="text-xs text-gray-600">{e.railPriority ? 'Yes' : 'No'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
