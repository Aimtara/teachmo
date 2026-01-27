import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { toast } from 'sonner';

import {
  ORCHESTRATOR_TYPES,
  approveAction,
  cancelAction,
  executeAction,
  listOrchestratorActions
} from '@/domains/commandCenter';
import { listAuditLog } from '@/domains/auditLog';

const STATUS_ORDER = ['queued', 'approved', 'running', 'done', 'failed', 'canceled'];

function StatusBadge({ status }) {
  const cls =
    status === 'queued'
      ? 'bg-gray-100 text-gray-900'
      : status === 'approved'
        ? 'bg-blue-100 text-blue-900'
        : status === 'running'
          ? 'bg-amber-100 text-amber-900'
          : status === 'done'
            ? 'bg-green-100 text-green-900'
            : status === 'failed'
              ? 'bg-red-100 text-red-900'
              : 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{status}</span>;
}

function TypeBadge({ type }) {
  const label =
    type === ORCHESTRATOR_TYPES.RUNBOOK_CREATE
      ? 'Runbook'
      : type === ORCHESTRATOR_TYPES.ESCALATE
        ? 'Escalate'
        : type === ORCHESTRATOR_TYPES.ROLLBACK
          ? 'Rollback'
          : type;
  const cls =
    type === ORCHESTRATOR_TYPES.ROLLBACK
      ? 'bg-red-50 text-red-900'
      : type === ORCHESTRATOR_TYPES.ESCALATE
        ? 'bg-amber-50 text-amber-900'
        : 'bg-indigo-50 text-indigo-900';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

function JsonBox({ value }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
      {text}
    </pre>
  );
}

export default function AdminCommandCenter() {
  const { isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const actorId = user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState([]);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listOrchestratorActions();
      const rows = data?.orchestrator_actions ?? [];
      setActions(rows);
      setError(null);
      if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async (entityId) => {
    if (!entityId) return;
    setAuditLoading(true);
    try {
      const data = await listAuditLog({ entityType: 'orchestrator_actions', entityId, limit: 80 });
      setAuditRows(data?.audit_log ?? []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to load audit log');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    reload();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedId) return;
    loadAudit(selectedId);
  }, [selectedId]);

  const counts = useMemo(() => {
    const byStatus = {};
    for (const a of actions) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    return { byStatus };
  }, [actions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeStatuses = new Set(['queued', 'approved', 'running']);

    return actions
      .filter((a) => (statusFilter === 'active' ? activeStatuses.has(a.status) : statusFilter === 'all' ? true : a.status === statusFilter))
      .filter((a) => (typeFilter === 'all' ? true : a.type === typeFilter))
      .filter((a) => {
        if (!q) return true;
        const epic = a.epic;
        return (
          (a.type || '').toLowerCase().includes(q) ||
          (a.status || '').toLowerCase().includes(q) ||
          (epic?.code || '').toLowerCase().includes(q) ||
          (epic?.title || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ai = STATUS_ORDER.indexOf(a.status);
        const bi = STATUS_ORDER.indexOf(b.status);
        if (ai !== bi) return ai - bi;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [actions, statusFilter, typeFilter, search]);

  const selected = useMemo(() => actions.find((a) => a.id === selectedId) ?? null, [actions, selectedId]);

  const canApprove = (action) => action && action.status === 'queued';
  const canExecute = (action) => action && action.status === 'approved';
  const canCancel = (action) => action && ['queued', 'approved'].includes(action.status);

  const handleApprove = async (action) => {
    if (!actorId) return toast.error('Missing actor id');
    try {
      await approveAction(action.id, actorId);
      toast.success('Approved');
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleCancel = async (action) => {
    if (!actorId) return toast.error('Missing actor id');
    try {
      await cancelAction(action.id, actorId);
      toast.success('Canceled');
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to cancel');
    }
  };

  const handleExecute = async (action) => {
    if (!actorId) return toast.error('Missing actor id');
    try {
      await executeAction(action, actorId);
      toast.success('Executed');
      await reload();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to execute');
    }
  };

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Command Center</h1>
            <p className="text-gray-600">Approve and execute operational actions generated from the Execution Board.</p>
          </div>
          <button
            onClick={reload}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s}</p>
              <p className="text-2xl font-semibold">{counts.byStatus[s] || 0}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions (epic code/title, status, type)…"
                className="w-full md:w-96 border rounded-lg px-3 py-2"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="active">Active (queued/approved/running)</option>
                <option value="all">All</option>
                <option value="queued">Queued</option>
                <option value="approved">Approved</option>
                <option value="running">Running</option>
                <option value="done">Done</option>
                <option value="failed">Failed</option>
                <option value="canceled">Canceled</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="all">All types</option>
                <option value={ORCHESTRATOR_TYPES.RUNBOOK_CREATE}>Runbook</option>
                <option value={ORCHESTRATOR_TYPES.ESCALATE}>Escalate</option>
                <option value={ORCHESTRATOR_TYPES.ROLLBACK}>Rollback</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">Created</th>
                  <th className="text-left px-3 py-2">Epic</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-3 py-3 text-gray-600" colSpan={4}>
                      Loading actions…
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td className="px-3 py-3 text-red-600" colSpan={4}>
                      Failed to load. {error.message}
                    </td>
                  </tr>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={4}>
                      No actions match these filters.
                    </td>
                  </tr>
                )}
                {!loading && !error &&
                  filtered.map((a) => (
                    <tr
                      key={a.id}
                      className={`border-t cursor-pointer hover:bg-gray-50 ${a.id === selectedId ? 'bg-gray-50' : ''}`}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <td className="px-3 py-2 text-xs text-gray-600">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-gray-700">{a.epic?.code || '—'}</div>
                        <div className="text-sm font-medium text-gray-900">{a.epic?.title || 'No epic'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <TypeBadge type={a.type} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Action details</h2>
              {selected?.epic?.code && (
                <Link
                  to={`/admin/execution-board?q=${encodeURIComponent(selected.epic.code)}`}
                  className="text-sm text-blue-700 hover:underline"
                >
                  View in Execution Board
                </Link>
              )}
            </div>
            {selected && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleApprove(selected)}
                  disabled={!canApprove(selected)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleExecute(selected)}
                  disabled={!canExecute(selected)}
                  className="rounded-lg bg-gray-900 text-white px-3 py-2 text-xs shadow-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Execute
                </button>
                <button
                  onClick={() => handleCancel(selected)}
                  disabled={!canCancel(selected)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!selected && <p className="text-sm text-gray-600">Select an action to see details.</p>}

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={selected.type} />
                <StatusBadge status={selected.status} />
                {selected.epic?.tag && (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                    {selected.epic.tag}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">Payload</p>
                <JsonBox value={selected.payload} />
              </div>

              {selected.result && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Result</p>
                  <JsonBox value={selected.result} />
                </div>
              )}

              {selected.error && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Error</p>
                  <pre className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                    {selected.error}
                  </pre>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Runbooks</p>
                  <p className="text-sm font-medium">{selected.runbooks?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Escalations</p>
                  <p className="text-sm font-medium">{selected.escalations?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Rollbacks</p>
                  <p className="text-sm font-medium">{selected.rollbacks?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Audit trail</p>
                  <button
                    onClick={() => loadAudit(selected.id)}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                {auditLoading && <p className="text-sm text-gray-600">Loading audit…</p>}
                {!auditLoading && auditRows.length === 0 && (
                  <p className="text-sm text-gray-600">No audit entries found for this action.</p>
                )}
                {!auditLoading && auditRows.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                    <ul className="divide-y">
                      {auditRows.map((row) => (
                        <li key={row.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-gray-700">{row.action}</span>
                            <span className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
                          </div>
                          {row.metadata && Object.keys(row.metadata || {}).length > 0 && (
                            <pre className="mt-2 max-h-28 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                              {JSON.stringify(row.metadata, null, 2)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
