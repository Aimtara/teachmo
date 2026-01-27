import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { API_BASE_URL } from '@/config/api';

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_API_KEY || '';
const WIP_LIMIT = 5;

function withInternalHeaders(init = {}, actor) {
  const headers = new Headers(init.headers || {});
  if (INTERNAL_KEY) headers.set('x-internal-key', INTERNAL_KEY);
  if (actor) headers.set('x-actor', actor);
  headers.set('content-type', 'application/json');
  return { ...init, headers };
}

const STATUS_OPTIONS = ['Backlog', 'Planned', 'In Progress', 'Blocked', 'Done'];

function percentDone(checklist = []) {
  const items = Array.isArray(checklist) ? checklist : [];
  if (items.length === 0) return 0;
  const done = items.filter((i) => i?.done).length;
  return Math.round((done / items.length) * 100);
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `rounded-lg px-3 py-2 text-sm font-semibold transition ` +
        (active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
      }
    >
      {children}
    </button>
  );
}

export default function AdminExecutionBoard() {
  const { isAuthenticated } = useAuthenticationStatus();

  const [tab, setTab] = useState('epics');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState(null);
  const [audit, setAudit] = useState([]);
  const [orchestratorActions, setOrchestratorActions] = useState([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();

  const reloadBoard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/board`, withInternalHeaders());
      if (!res.ok) throw new Error(`Failed to load board (${res.status})`);
      const data = await res.json();
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const reloadAudit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/audit?limit=200`, withInternalHeaders());
      if (!res.ok) throw new Error(`Failed to load audit (${res.status})`);
      const rows = await res.json();
      setAudit(rows);
    } catch (err) {
      console.warn('Audit load failed', err);
    }
  };

  const reloadOrchestrator = async () => {
    setOpsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/orchestrator-actions?limit=100`, withInternalHeaders());
      if (!res.ok) throw new Error(`Failed to load ops (${res.status})`);
      const payload = await res.json();
      setOrchestratorActions(payload.rows || []);
    } catch (err) {
      console.warn('Ops load failed', err);
    } finally {
      setOpsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = searchParams.get('q');
    if (q) setQuery(q);
    reloadBoard();
    reloadAudit();
  }, [isAuthenticated, searchParams]);

  useEffect(() => {
    if (!isAuthenticated || tab !== 'ops') return;
    reloadOrchestrator();
  }, [isAuthenticated, tab]);

  const epics = board?.epics || [];
  const gates = board?.gates || [];
  const slices = board?.slices || [];
  const dependencies = board?.dependencies || [];
  const railPriorityCount = epics.filter((e) => Boolean(e.railPriority)).length;
  const wipOverLimit = railPriorityCount > WIP_LIMIT;

  const epicOptions = useMemo(() => epics.map((e) => ({ id: e.id, label: `${e.id} — ${e.workstream}` })), [epics]);
  const gateOptions = useMemo(() => gates.map((g) => g.gate), [gates]);

  const filteredEpics = useMemo(() => {
    if (!query.trim()) return epics;
    const q = query.toLowerCase();
    return epics.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.workstream.toLowerCase().includes(q) ||
        (e.tag || '').toLowerCase().includes(q) ||
        (e.railSegment || '').toLowerCase().includes(q)
    );
  }, [epics, query]);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  const patchEpic = async (id, patch) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/epics/${id}`,
        withInternalHeaders({ method: 'PATCH', body: JSON.stringify(patch) }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const patchGate = async (gate, patch) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/gates/${gate}`,
        withInternalHeaders({ method: 'PATCH', body: JSON.stringify(patch) }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const patchSlice = async (id, patch) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/slices/${id}`,
        withInternalHeaders({ method: 'PATCH', body: JSON.stringify(patch) }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const createNewSlice = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/slices`,
        withInternalHeaders({ method: 'POST', body: JSON.stringify(payload) }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const addDependency = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/execution-board/dependencies`,
        withInternalHeaders({ method: 'POST', body: JSON.stringify(payload) }, 'system_admin')
      );
      if (!res.ok && res.status !== 409) throw new Error(`Add dependency failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const removeDependency = async (id) => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/execution-board/dependencies/${id}`,
        withInternalHeaders({ method: 'DELETE' }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Delete dependency failed (${res.status})`);
      const next = await res.json();
      setBoard(next);
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const exportBackendCsv = async (entity) => {
    const res = await fetch(
      `${API_BASE_URL}/execution-board/export?entity=${encodeURIComponent(entity)}&format=csv`,
      withInternalHeaders()
    );
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const text = await res.text();
    downloadCsv(`teachmo_${entity}.csv`, text);
  };

  const queueOrchestratorAction = async ({ actionType, entityType, entityId, payload }) => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/execution-board/orchestrator-actions`,
        withInternalHeaders({ method: 'POST', body: JSON.stringify({ actionType, entityType, entityId, payload }) }, 'system_admin')
      );
      if (!res.ok) throw new Error(`Queue action failed (${res.status})`);
      await res.json();
      await reloadOrchestrator();
      await reloadAudit();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-gray-900">Execution Board</h1>
        <p className="text-gray-600">
          This is the dependency rail made visible: epics, gates, slices, blockers, and change history.
        </p>
        <div className="text-sm text-gray-600">
          Rail priorities: <span className={wipOverLimit ? 'font-semibold text-red-700' : 'font-semibold'}>{railPriorityCount}</span> / {WIP_LIMIT}
        </div>
        <div className="text-xs text-gray-500">
          {board?.updatedAt ? `Seed updated: ${board.updatedAt}` : ''} {saving ? ' • Saving…' : ''}
        </div>
      </header>

      {loading && <p className="text-gray-600">Loading execution board…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          {error.message}
        </p>
      )}

      {!loading && board && (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {gates.map((g) => (
              <div key={g.gate} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">{g.gate}</div>
                    <div className="text-sm font-semibold text-gray-900">{g.purpose}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{percentDone(g.checklist)}%</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-gray-900"
                    style={{ width: `${percentDone(g.checklist)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">Status: {g.status}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === 'epics'} onClick={() => setTab('epics')}>Epics</TabButton>
            <TabButton active={tab === 'gates'} onClick={() => setTab('gates')}>Gates</TabButton>
            <TabButton active={tab === 'slices'} onClick={() => setTab('slices')}>Slices</TabButton>
            <TabButton active={tab === 'dependencies'} onClick={() => setTab('dependencies')}>Dependencies</TabButton>
            <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>Audit</TabButton>
            <TabButton active={tab === 'ops'} onClick={() => setTab('ops')}>Ops</TabButton>
            <TabButton active={tab === 'exports'} onClick={() => setTab('exports')}>Exports</TabButton>
            <div className="flex-1" />
            {tab === 'epics' && (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full md:w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                placeholder="Search epics…"
              />
            )}
            {tab === 'epics' && (
              <>
                <button
                  type="button"
                  onClick={() => exportBackendCsv('epics')}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Export epics (backend)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const csv = toCsv(filteredEpics, [
                      'id',
                      'workstream',
                      'tag',
                      'railSegment',
                      'ownerRole',
                      'status',
                      'blocked',
                      'gates',
                      'railPriority',
                      'nextMilestone',
                      'dod',
                      'notes'
                    ]);
                    downloadCsv('execution_epics_local.csv', csv);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Export epics (local)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={reloadBoard}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {tab === 'epics' && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Workstream</th>
                    <th className="text-left px-3 py-2">Tag</th>
                    <th className="text-left px-3 py-2">Rail</th>
                    <th className="text-left px-3 py-2">Gates</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Rail priority</th>
                    <th className="text-left px-3 py-2">Blocked</th>
                    <th className="text-left px-3 py-2">Owner</th>
                    <th className="text-left px-3 py-2">Ops</th>
                    <th className="text-left px-3 py-2">DoD</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEpics.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">{e.id}</td>
                      <td className="px-3 py-2 text-gray-900 min-w-[260px]">{e.workstream}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.tag}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.railSegment}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.gates}</td>
                      <td className="px-3 py-2">
                        <select
                          value={e.status}
                          onChange={(ev) => patchEpic(e.id, { status: ev.target.value })}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(e.railPriority)}
                          onChange={(ev) => {
                            const nextValue = ev.target.checked;
                            const isEnabling = nextValue && !e.railPriority;
                            if (isEnabling && railPriorityCount >= WIP_LIMIT) {
                              setError(new Error(`WIP limit reached (${WIP_LIMIT}). Finish a priority before adding another.`));
                              return;
                            }
                            patchEpic(e.id, { railPriority: nextValue });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className={e.blocked ? 'text-red-700 font-semibold' : 'text-gray-500'}>
                          {e.blocked ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={e.ownerRole || ''}
                          onBlur={(ev) => {
                            const value = ev.target.value.trim();
                            if (value !== (e.ownerRole || '')) patchEpic(e.id, { ownerRole: value });
                          }}
                          className="w-36 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                          placeholder="Owner"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => queueOrchestratorAction({
                              actionType: 'RUNBOOK_CREATE',
                              entityType: 'epic',
                              entityId: e.id,
                              payload: { workstream: e.workstream, tag: e.tag }
                            })}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Runbook
                          </button>
                          <button
                            type="button"
                            onClick={() => queueOrchestratorAction({
                              actionType: 'ESCALATE',
                              entityType: 'epic',
                              entityId: e.id,
                              payload: { reason: 'Needs attention' }
                            })}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Escalate
                          </button>
                          <button
                            type="button"
                            onClick={() => queueOrchestratorAction({
                              actionType: 'ROLLBACK',
                              entityType: 'epic',
                              entityId: e.id,
                              payload: { hint: 'Feature-flag rollback or revert deploy' }
                            })}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Rollback
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 min-w-[280px]">{e.dod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'gates' && (
            <div className="grid gap-4 md:grid-cols-2">
              {gates.map((g) => (
                <div key={g.gate} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{g.gate}: {g.purpose}</h2>
                      <div className="text-xs text-gray-500">Owner: {g.ownerRole || '—'} • Depends on: {g.dependsOn || '—'}</div>
                    </div>
                    <select
                      value={g.status}
                      onChange={(ev) => patchGate(g.gate, { status: ev.target.value })}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    >
                      {['Planned', 'In Progress', 'Blocked', 'Done'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {(g.checklist || []).map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(item.done)}
                          onChange={(ev) => {
                            const next = (g.checklist || []).map((i) =>
                              i.id === item.id ? { ...i, done: ev.target.checked } : i
                            );
                            patchGate(g.gate, { checklist: next });
                          }}
                        />
                        <span className={item.done ? 'text-gray-500 line-through' : 'text-gray-800'}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === 'slices' && (
            <SlicesTab
              slices={slices}
              epics={epicOptions}
              gates={gateOptions}
              onPatch={patchSlice}
              onCreate={createNewSlice}
            />
          )}

          {tab === 'dependencies' && (
            <DependenciesTab
              dependencies={dependencies}
              epics={epicOptions}
              onAdd={addDependency}
              onRemove={removeDependency}
            />
          )}

          {tab === 'audit' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Change history</h2>
              <p className="text-sm text-gray-600">Latest updates across epics, gates, slices, and dependencies.</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    const csv = toCsv(audit, ['id', 'entity', 'entityId', 'action', 'actor', 'createdAt', 'patch']);
                    downloadCsv('execution_audit_local.csv', csv);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Export audit (local)
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {audit.map((row) => (
                  <li key={row.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">
                        {row.entity} {row.entityId} — {row.action}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleString()}</div>
                    </div>
                    {row.actor && <div className="text-xs text-gray-500">Actor: {row.actor}</div>}
                    {row.patch && (
                      <pre className="mt-2 overflow-x-auto text-xs text-gray-700">{JSON.stringify(row.patch, null, 2)}</pre>
                    )}
                  </li>
                ))}
                {audit.length === 0 && <li className="text-sm text-gray-500">No audit entries yet.</li>}
              </ul>
            </div>
          )}

          {tab === 'ops' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Orchestrator queue</h2>
                  <p className="text-sm text-gray-600">Queued runbooks, escalations, and rollbacks.</p>
                </div>
                <button
                  type="button"
                  onClick={reloadOrchestrator}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    const csv = toCsv(orchestratorActions, [
                      'id',
                      'actionType',
                      'entityType',
                      'entityId',
                      'requestedBy',
                      'status',
                      'createdAt',
                      'payload',
                      'result'
                    ]);
                    downloadCsv('execution_orchestrator_local.csv', csv);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Export ops (local)
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2">ID</th>
                      <th className="text-left px-3 py-2">Action</th>
                      <th className="text-left px-3 py-2">Entity</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orchestratorActions.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.id}</td>
                        <td className="px-3 py-2">{row.actionType}</td>
                        <td className="px-3 py-2">{row.entityType}:{row.entityId}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {orchestratorActions.length === 0 && !opsLoading && (
                      <tr>
                        <td className="px-3 py-2 text-gray-500" colSpan={5}>No orchestrator actions yet.</td>
                      </tr>
                    )}
                    {opsLoading && (
                      <tr>
                        <td className="px-3 py-2 text-gray-500" colSpan={5}>Loading ops…</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'exports' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">CSV exports</h2>
                <p className="text-sm text-gray-600">
                  Export from the backend API or download the exact rows currently shown.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">Backend exports</div>
                <div className="flex flex-wrap gap-2">
                  {['epics', 'gates', 'slices', 'dependencies'].map((entity) => (
                    <button
                      key={entity}
                      type="button"
                      onClick={() => exportBackendCsv(entity)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Export {entity}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">Local exports</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csv = toCsv(epics, [
                        'id',
                        'workstream',
                        'tag',
                        'railSegment',
                        'ownerRole',
                        'status',
                        'blocked',
                        'gates',
                        'railPriority',
                        'nextMilestone',
                        'dod',
                        'notes'
                      ]);
                      downloadCsv('execution_epics_local.csv', csv);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Local epics
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = toCsv(gates, ['gate', 'purpose', 'status', 'progress', 'ownerRole', 'dependsOn', 'targetWindow', 'checklist']);
                      downloadCsv('execution_gates_local.csv', csv);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Local gates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = toCsv(slices, ['id', 'outcome', 'primaryEpic', 'gate', 'status', 'owner', 'dependsOn', 'inputs', 'deliverables', 'acceptance']);
                      downloadCsv('execution_slices_local.csv', csv);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Local slices
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = toCsv(dependencies, ['id', 'fromEpic', 'toEpic', 'type', 'notes']);
                      downloadCsv('execution_dependencies_local.csv', csv);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Local dependencies
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SlicesTab({ slices, epics, gates, onPatch, onCreate }) {
  const [draft, setDraft] = useState({
    id: '',
    outcome: '',
    primaryEpic: epics[0]?.id || '',
    gate: gates[0] || '',
    status: 'Backlog',
    owner: ''
  });

  useEffect(() => {
    if (!draft.primaryEpic && epics[0]?.id) setDraft((d) => ({ ...d, primaryEpic: epics[0].id }));
    if (!draft.gate && gates[0]) setDraft((d) => ({ ...d, gate: gates[0] }));
  }, [epics, gates]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Create slice</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <input
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="ID (e.g. S11)"
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
          />
          <input
            className="md:col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="Outcome"
            value={draft.outcome}
            onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value }))}
          />
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={draft.primaryEpic}
            onChange={(e) => setDraft((d) => ({ ...d, primaryEpic: e.target.value }))}
          >
            {epics.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={draft.gate}
            onChange={(e) => setDraft((d) => ({ ...d, gate: e.target.value }))}
          >
            {gates.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const id = draft.id.trim();
              const outcome = draft.outcome.trim();
              if (!id || !outcome) return;
              onCreate({
                id,
                outcome,
                primaryEpic: draft.primaryEpic,
                gate: draft.gate,
                status: draft.status,
                owner: draft.owner
              });
              setDraft((d) => ({ ...d, id: '', outcome: '' }));
            }}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Outcome</th>
              <th className="text-left px-3 py-2">Epic</th>
              <th className="text-left px-3 py-2">Gate</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Owner</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">{s.id}</td>
                <td className="px-3 py-2 text-gray-900 min-w-[300px]">{s.outcome}</td>
                <td className="px-3 py-2">
                  <select
                    value={s.primaryEpic || ''}
                    onChange={(e) => onPatch(s.id, { primaryEpic: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {epics.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={s.gate || ''}
                    onChange={(e) => onPatch(s.id, { gate: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {gates.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={s.status}
                    onChange={(e) => onPatch(s.id, { status: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={s.owner || ''}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== (s.owner || '')) onPatch(s.id, { owner: value });
                    }}
                    className="w-40 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    placeholder="Owner"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DependenciesTab({ dependencies, epics, onAdd, onRemove }) {
  const [fromEpic, setFromEpic] = useState(epics[0]?.id || '');
  const [toEpic, setToEpic] = useState(epics[1]?.id || '');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!fromEpic && epics[0]?.id) setFromEpic(epics[0].id);
    if (!toEpic && epics[1]?.id) setToEpic(epics[1].id);
  }, [epics]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Add dependency</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={fromEpic}
            onChange={(e) => setFromEpic(e.target.value)}
          >
            {epics.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={toEpic}
            onChange={(e) => setToEpic(e.target.value)}
          >
            {epics.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <input
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (!fromEpic || !toEpic || fromEpic === toEpic) return;
              onAdd({ fromEpic, toEpic, type: 'blocks', notes: notes.trim() });
              setNotes('');
            }}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">From</th>
              <th className="text-left px-3 py-2">To</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Notes</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dependencies.map((d) => (
              <tr key={d.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-900">{d.id}</td>
                <td className="px-3 py-2">{d.fromEpic}</td>
                <td className="px-3 py-2">{d.toEpic}</td>
                <td className="px-3 py-2">{d.type}</td>
                <td className="px-3 py-2 text-gray-700">{d.notes}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
