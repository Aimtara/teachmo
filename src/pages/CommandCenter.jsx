import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthenticationStatus, useUserData } from '@nhost/react';

import {
  ORCHESTRATOR_TYPES,
  approveCommandCenterAction,
  cancelCommandCenterAction,
  createCommandCenterAction,
  executeCommandCenterAction,
  getCommandCenterAction,
  listCommandCenterActions,
  listCommandCenterAudit
} from '@/domains/commandCenter';

const STATUS_OPTIONS = ['all', 'queued', 'approved', 'running', 'done', 'failed', 'canceled'];
const TYPE_OPTIONS = ['all', ...Object.values(ORCHESTRATOR_TYPES)];

function clsStatus(status) {
  if (status === 'queued') return 'bg-gray-100 text-gray-900';
  if (status === 'approved') return 'bg-blue-100 text-blue-900';
  if (status === 'running') return 'bg-amber-100 text-amber-900';
  if (status === 'done') return 'bg-green-100 text-green-900';
  if (status === 'failed') return 'bg-red-100 text-red-900';
  if (status === 'canceled') return 'bg-gray-100 text-gray-700';
  return 'bg-gray-100 text-gray-800';
}

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function safeParseJson(text) {
  if (!text || !String(text).trim()) return {};
  return JSON.parse(text);
}

export default function CommandCenter() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { user } = useUserData();
  const [searchParams, setSearchParams] = useSearchParams();

  const actorId = user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const [audit, setAudit] = useState([]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState(ORCHESTRATOR_TYPES.RUNBOOK_CREATE);
  const [newTitle, setNewTitle] = useState('');
  const [newPayloadText, setNewPayloadText] = useState('{\n  "severity": "warn",\n  "target": "slack"\n}');
  const [formError, setFormError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Optional: prefill creation form via query params.
  // Example: /internal/command-center?type=RUNBOOK_CREATE&title=...&payload={...}
  useEffect(() => {
    const preType = searchParams.get('type');
    const preTitle = searchParams.get('title');
    const prePayload = searchParams.get('payload');

    let touched = false;
    if (preType && Object.values(ORCHESTRATOR_TYPES).includes(preType)) {
      setNewType(preType);
      touched = true;
    }
    if (preTitle) {
      setNewTitle(preTitle);
      touched = true;
    }
    if (prePayload) {
      setNewPayloadText(prePayload);
      touched = true;
    }

    if (touched) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const reload = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        listCommandCenterActions({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          limit: 400
        }),
        listCommandCenterAudit({ limit: 200 })
      ]);

      setActions(a.actions || []);
      setAudit(b.audit || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    reload();
  }, [isAuthenticated, statusFilter, typeFilter]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    const load = async () => {
      setDetailLoading(true);
      try {
        const res = await getCommandCenterAction(selectedId);
        setSelected(res.action);
      } catch (err) {
        setSelected(null);
        setError(err);
      } finally {
        setDetailLoading(false);
      }
    };

    load();
  }, [selectedId]);

  const filteredActions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return actions;

    return actions.filter((a) => {
      const hay = [a.id, a.type, a.status, a.title, prettyJson(a.payload)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [actions, search]);

  const onCreate = async () => {
    setFormError(null);
    setCreating(true);
    try {
      const payload = safeParseJson(newPayloadText);
      await createCommandCenterAction({
        type: newType,
        title: newTitle,
        payload,
        actorId
      });

      setNewTitle('');
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setCreating(false);
    }
  };

  const act = async (fn) => {
    try {
      await fn();
      await reload();
      if (selectedId) {
        try {
          const detail = await getCommandCenterAction(selectedId);
          setSelected(detail.action);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err);
    }
  };

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Command Center</h1>
        <p className="text-gray-600">
          Plan, approve, and execute operational actions. Today this runs as a stub executor (file-backed),
          but the UI + contract are designed to plug into the real orchestrator later.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline text-gray-700" to="/internal/execution-board">
            Open Execution Board
          </Link>
          <a
            className="underline text-gray-700"
            href="/api/command-center/actions"
            target="_blank"
            rel="noreferrer"
          >
            Actions JSON
          </a>
          <a
            className="underline text-gray-700"
            href="/api/command-center/audit"
            target="_blank"
            rel="noreferrer"
          >
            Audit JSON
          </a>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          <p className="font-semibold">Something went sideways.</p>
          <p className="text-sm opacity-90 mt-1">{error.message || String(error)}</p>
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Queue an action</h2>
            <p className="text-sm text-gray-600">
              These actions show up in the approvals/execution queue and produce an audit trail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className="text-sm text-gray-700">
            <span className="block text-xs text-gray-500">Type</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              value={newType}
              onChange={(e) => {
                const t = e.target.value;
                setNewType(t);
                if (t === ORCHESTRATOR_TYPES.RUNBOOK_CREATE) {
                  setNewPayloadText('{\n  "incident": "",\n  "service": "",\n  "severity": "warn"\n}');
                } else if (t === ORCHESTRATOR_TYPES.ESCALATE) {
                  setNewPayloadText('{\n  "severity": "warn",\n  "target": "slack",\n  "message": ""\n}');
                } else if (t === ORCHESTRATOR_TYPES.ROLLBACK) {
                  setNewPayloadText('{\n  "deployment": "",\n  "reason": ""\n}');
                }
              }}
            >
              {Object.values(ORCHESTRATOR_TYPES).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700 lg:col-span-2">
            <span className="block text-xs text-gray-500">Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Create runbook for duplicate message storm"
            />
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              onClick={onCreate}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        <label className="text-sm text-gray-700">
          <span className="block text-xs text-gray-500">Payload (JSON)</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs min-h-[120px]"
            value={newPayloadText}
            onChange={(e) => setNewPayloadText(e.target.value)}
            spellCheck={false}
          />
        </label>

        {formError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">
            <span className="font-semibold">Fix payload JSON:</span> {formError.message || String(formError)}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-gray-900">Action queue</h2>
                <p className="text-sm text-gray-600">
                  Approve → execute → track results. (Stub executor completes instantly.)
                </p>
              </div>

              <label className="text-sm text-gray-700 lg:min-w-[260px]">
                <span className="block text-xs text-gray-500">Search</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="id, title, payload…"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="text-sm text-gray-700">
                <span className="block text-xs text-gray-500">Status</span>
                <select
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="block text-xs text-gray-500">Type</span>
                <select
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loading ? (
              <p className="text-gray-600">Loading actions…</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActions.map((a) => (
                      <tr
                        key={a.id}
                        className={`rounded-lg ${selectedId === a.id ? 'bg-slate-100' : 'bg-slate-50'} text-sm text-gray-800`}
                        onClick={() => setSelectedId(a.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${clsStatus(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap text-xs text-gray-700">
                          {a.type}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-gray-900">{a.title || '—'}</div>
                          <div className="text-xs text-gray-500 mt-1">{a.id}</div>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap text-xs text-gray-700">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                              disabled={a.status !== 'queued'}
                              onClick={() => act(() => approveCommandCenterAction(a.id, actorId))}
                            >
                              Approve
                            </button>
                            <button
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                              disabled={!['approved', 'queued'].includes(a.status)}
                              onClick={() => act(() => executeCommandCenterAction(a.id, actorId))}
                            >
                              Execute
                            </button>
                            <button
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                              disabled={!['queued', 'approved', 'running'].includes(a.status)}
                              onClick={() => act(() => cancelCommandCenterAction(a.id, { actorId, reason: 'Canceled in UI' }))}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredActions.length === 0 && (
                  <p className="text-sm text-gray-600 mt-3">No actions match the current filters.</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Selected action</h2>

            {!selectedId && <p className="text-sm text-gray-600">Pick an action from the queue to see details.</p>}
            {selectedId && detailLoading && <p className="text-sm text-gray-600">Loading details…</p>}
            {selectedId && !detailLoading && selected && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${clsStatus(selected.status)}`}>
                      {selected.status}
                    </span>
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-900">
                      {selected.type}
                    </span>
                    <span className="text-xs text-gray-500">{selected.id}</span>
                  </div>

                  <p className="text-sm text-gray-900 font-medium">{selected.title || '—'}</p>

                  <dl className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>
                      <dt className="text-gray-500">Created</dt>
                      <dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Approved</dt>
                      <dd>{selected.approvedAt ? new Date(selected.approvedAt).toLocaleString() : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Executed</dt>
                      <dd>{selected.executedAt ? new Date(selected.executedAt).toLocaleString() : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Updated</dt>
                      <dd>{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : '—'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Payload</p>
                    <pre className="mt-1 rounded-lg border border-gray-200 bg-slate-50 p-3 text-xs overflow-auto max-h-[240px]">{prettyJson(selected.payload)}</pre>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600">Result</p>
                    <pre className="mt-1 rounded-lg border border-gray-200 bg-slate-50 p-3 text-xs overflow-auto max-h-[240px]">{prettyJson(selected.result)}</pre>
                  </div>

                  {selected.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                      <span className="font-semibold">Error:</span> {String(selected.error)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Audit trail</h2>
            <p className="text-sm text-gray-600">Recent events for approvals/executions.</p>

            <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
              {audit.length === 0 && <p className="text-sm text-gray-600">No events yet.</p>}
              {audit.map((e) => (
                <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-900">{e.action}</p>
                  <p className="text-xs text-gray-600 mt-1">{e.ts ? new Date(e.ts).toLocaleString() : '—'}</p>
                  {e.entityId && (
                    <button
                      className="mt-2 text-xs underline text-gray-700"
                      onClick={() => setSelectedId(e.entityId)}
                    >
                      Open {e.entityId}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Use this during pilot hardening to record why you did a thing, not just what you did.</li>
              <li>When you plug in the real orchestrator, keep the same action statuses + audit events.</li>
              <li>For now, this stores to <code className="px-1 rounded bg-slate-50 border">backend/data/commandCenter.json</code>.</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
