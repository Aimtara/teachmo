import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import {
  EnterpriseBadge,
  EnterpriseDataTable,
  EnterprisePreferencesPanel,
  EnterpriseShell,
  EnterpriseStatCard,
  useEnterprisePreferences
} from '@/components/enterprise';
import { enterpriseRoles } from '@/design/tokens';

const STATUS_ORDER = ['queued', 'approved', 'running', 'done', 'failed', 'canceled'];

function StatusBadge({ status }) {
  const variant =
    status === 'done'
      ? 'success'
      : status === 'failed'
        ? 'danger'
        : status === 'running'
          ? 'warning'
          : status === 'approved'
            ? 'info'
            : 'neutral';
  return <EnterpriseBadge variant={variant} pulse={status === 'running'}>{status}</EnterpriseBadge>;
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
  const variant =
    type === ORCHESTRATOR_TYPES.ROLLBACK
      ? 'danger'
      : type === ORCHESTRATOR_TYPES.ESCALATE
        ? 'warning'
        : 'info';
  return <EnterpriseBadge variant={variant}>{label}</EnterpriseBadge>;
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
    <pre className="max-h-64 overflow-auto rounded-xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_5%,transparent)] p-3 text-xs text-[var(--enterprise-foreground)]">
      {text}
    </pre>
  );
}

const SAMPLE_ACTIONS = [
  {
    id: 'sample-runbook',
    status: 'queued',
    type: ORCHESTRATOR_TYPES.RUNBOOK_CREATE,
    created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    epic: { code: 'OPS-212', title: 'SSO certificate rotation', tag: 'security' },
    payload: { severity: 'high', owner: 'District IT', guardrail: 'requires approval' },
    runbooks: [{ id: 'rb-1' }],
    escalations: [],
    rollbacks: []
  },
  {
    id: 'sample-escalate',
    status: 'running',
    type: ORCHESTRATOR_TYPES.ESCALATE,
    created_at: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
    epic: { code: 'DATA-144', title: 'Roster sync anomaly', tag: 'directory' },
    payload: { severity: 'medium', owner: 'School ops', impactedSchools: 3 },
    runbooks: [],
    escalations: [{ id: 'esc-1' }],
    rollbacks: []
  },
  {
    id: 'sample-rollback',
    status: 'approved',
    type: ORCHESTRATOR_TYPES.ROLLBACK,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    epic: { code: 'AI-088', title: 'Governance policy rollback', tag: 'ai governance' },
    payload: { severity: 'critical', owner: 'AI review', policyMode: 'shadow' },
    runbooks: [],
    escalations: [],
    rollbacks: [{ id: 'rbk-1' }]
  }
];

export default function AdminCommandCenter() {
  const { isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const actorId = user?.id;
  const navigate = useNavigate();
  const { preferences, setPreference } = useEnterprisePreferences();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrchestratorActions();
      const rows = data?.orchestrator_actions ?? [];
      setActions(rows);
      setError(null);
      setSelectedId((current) => current || rows[0]?.id || null);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [isAuthenticated, reload]);

  useEffect(() => {
    if (!selectedId) return;
    loadAudit(selectedId);
  }, [selectedId]);

  const displayActions = actions.length > 0 ? actions : import.meta.env.DEV ? SAMPLE_ACTIONS : actions;

  useEffect(() => {
    if (!selectedId && displayActions.length > 0) setSelectedId(displayActions[0].id);
  }, [displayActions, selectedId]);

  const counts = useMemo(() => {
    const byStatus = {};
    for (const a of displayActions) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    return { byStatus };
  }, [displayActions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeStatuses = new Set(['queued', 'approved', 'running']);

    return displayActions
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
  }, [displayActions, statusFilter, typeFilter, search]);

  const selected = useMemo(() => displayActions.find((a) => a.id === selectedId) ?? null, [displayActions, selectedId]);

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

  const roleConfig = enterpriseRoles[preferences.role] ?? enterpriseRoles.system_admin;

  const commands = useMemo(
    () => [
      {
        id: 'refresh-actions',
        label: 'Refresh command queue',
        description: 'Reload operational approvals and audit state.',
        group: 'Ops',
        variant: 'info',
        voice: 'refresh command queue',
        run: reload
      },
      {
        id: 'open-audit',
        label: 'Open audit logs',
        description: 'Navigate to enterprise audit evidence.',
        group: 'Security',
        variant: 'success',
        voice: 'open audit logs',
        href: '/admin/audit-logs'
      },
      {
        id: 'dark-mode',
        label: 'Switch to dark mode',
        description: 'Apply the enterprise dark theme.',
        group: 'Theme',
        voice: 'dark mode',
        run: () => setPreference('theme', 'dark')
      },
      {
        id: 'high-contrast',
        label: 'Switch to high contrast',
        description: 'Apply WCAG-focused high-contrast tokens.',
        group: 'Theme',
        variant: 'warning',
        voice: 'high contrast',
        run: () => setPreference('theme', 'highContrast')
      }
    ],
    [reload, setPreference]
  );

  const handleCommand = (command) => {
    if (command.href) navigate(command.href);
    command.run?.();
  };

  const tableColumns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'Created',
        accessor: (row) => new Date(row.created_at).toLocaleString()
      },
      {
        id: 'epic',
        header: 'Epic',
        accessor: (row) => `${row.epic?.code ?? ''} ${row.epic?.title ?? ''}`,
        editable: true,
        cell: (row) => (
          <span className="min-w-0">
            <span className="block font-mono text-xs text-[var(--enterprise-muted)]">{row.epic?.code || '—'}</span>
            <span className="block truncate font-medium">{row.epic?.title || 'No epic'}</span>
          </span>
        )
      },
      {
        id: 'type',
        header: 'Type',
        accessor: 'type',
        cell: (row) => <TypeBadge type={row.type} />
      },
      {
        id: 'status',
        header: 'Status',
        accessor: 'status',
        cell: (row) => <StatusBadge status={row.status} />
      },
      {
        id: 'owner',
        header: 'Owner',
        accessor: (row) => row.payload?.owner ?? 'Unassigned'
      }
    ],
    []
  );

  if (!isAuthenticated && !import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
    <EnterpriseShell
      commands={commands}
      onCommand={handleCommand}
      role={preferences.role}
      title="Enterprise Command Center"
      subtitle={`${roleConfig.mission} ${roleConfig.ambientPrompt}`}
    >
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Command center KPIs">
        {STATUS_ORDER.map((status) => (
          <EnterpriseStatCard
            key={status}
            label={status}
            value={counts.byStatus[status] || 0}
            badge={status === 'queued' || status === 'running' ? 'Needs review' : 'Tracked'}
            badgeVariant={status === 'failed' ? 'danger' : status === 'running' ? 'warning' : 'info'}
            trend={status === 'failed' ? 'down' : status === 'done' ? 'up' : 'flat'}
            description={status === 'queued' ? roleConfig.primaryKpi : undefined}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-4 shadow-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, epics, owners..."
              className="enterprise-focus min-w-60 flex-1 rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
              aria-label="Filter command center actions"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="enterprise-focus rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
              aria-label="Filter by status"
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="enterprise-focus rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value={ORCHESTRATOR_TYPES.RUNBOOK_CREATE}>Runbook</option>
              <option value={ORCHESTRATOR_TYPES.ESCALATE}>Escalate</option>
              <option value={ORCHESTRATOR_TYPES.ROLLBACK}>Rollback</option>
            </select>
            <button
              onClick={reload}
              disabled={loading}
              className="enterprise-focus enterprise-motion rounded-xl bg-[var(--enterprise-primary)] px-4 py-2 text-sm font-semibold text-white hover:-translate-y-0.5"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--enterprise-danger)] bg-[color-mix(in_srgb,var(--enterprise-danger)_10%,transparent)] p-4 text-sm text-[var(--enterprise-foreground)]" role="alert">
              Failed to load live actions. Development mode is showing preview rows. {error.message}
            </div>
          ) : null}

          <EnterpriseDataTable
            ariaLabel="Command center actions"
            rows={filtered}
            columns={tableColumns}
            selectedRowId={selectedId}
            onRowSelect={(row) => setSelectedId(row.id)}
            onInlineEdit={() => toast.success('Inline edit staged locally; save workflow integration is next.')}
            storageKey="teachmo_command_center_views"
            height={preferences.density === 'compact' ? 330 : 430}
            rowHeight={preferences.density === 'compact' ? 48 : 64}
          />
        </div>

        <aside className="space-y-4">
          <EnterprisePreferencesPanel preferences={preferences} setPreference={setPreference} />
          <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--enterprise-foreground)]">Action details</h2>
              {selected?.epic?.code && (
                <Link
                  to={`/admin/execution-board?q=${encodeURIComponent(selected.epic.code)}`}
                  className="text-sm text-[var(--enterprise-primary)] hover:underline"
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
                  className="enterprise-focus rounded-lg border border-[var(--enterprise-border)] px-3 py-2 text-xs shadow-sm disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleExecute(selected)}
                  disabled={!canExecute(selected)}
                  className="enterprise-focus rounded-lg bg-[var(--enterprise-primary)] text-white px-3 py-2 text-xs shadow-sm disabled:opacity-50"
                >
                  Execute
                </button>
                <button
                  onClick={() => handleCancel(selected)}
                  disabled={!canCancel(selected)}
                  className="enterprise-focus rounded-lg border border-[var(--enterprise-border)] px-3 py-2 text-xs shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!selected && <p className="text-sm text-[var(--enterprise-muted)]">Select an action to see details.</p>}

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={selected.type} />
                <StatusBadge status={selected.status} />
                {selected.epic?.tag && (
                  <EnterpriseBadge>{selected.epic.tag}</EnterpriseBadge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[var(--enterprise-muted)]">Payload</p>
                <JsonBox value={selected.payload} />
              </div>

              {selected.result && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--enterprise-muted)]">Result</p>
                  <JsonBox value={selected.result} />
                </div>
              )}

              {selected.error && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--enterprise-muted)]">Error</p>
                  <pre className="rounded-lg border border-[var(--enterprise-danger)] bg-[color-mix(in_srgb,var(--enterprise-danger)_10%,transparent)] p-3 text-xs text-[var(--enterprise-danger)]">
                    {selected.error}
                  </pre>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--enterprise-border)] p-3">
                  <p className="text-xs text-[var(--enterprise-muted)]">Runbooks</p>
                  <p className="text-sm font-medium">{selected.runbooks?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-[var(--enterprise-border)] p-3">
                  <p className="text-xs text-[var(--enterprise-muted)]">Escalations</p>
                  <p className="text-sm font-medium">{selected.escalations?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-[var(--enterprise-border)] p-3">
                  <p className="text-xs text-[var(--enterprise-muted)]">Rollbacks</p>
                  <p className="text-sm font-medium">{selected.rollbacks?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--enterprise-muted)]">Audit trail</p>
                  <button
                    onClick={() => loadAudit(selected.id)}
                    className="enterprise-focus text-xs text-[var(--enterprise-primary)] hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                {auditLoading && <p className="text-sm text-[var(--enterprise-muted)]">Loading audit…</p>}
                {!auditLoading && auditRows.length === 0 && (
                  <p className="text-sm text-[var(--enterprise-muted)]">No audit entries found for this action.</p>
                )}
                {!auditLoading && auditRows.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-lg border border-[var(--enterprise-border)]">
                    <ul className="divide-y">
                      {auditRows.map((row) => (
                        <li key={row.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[var(--enterprise-foreground)]">{row.action}</span>
                            <span className="text-xs text-[var(--enterprise-muted)]">{new Date(row.created_at).toLocaleString()}</span>
                          </div>
                          {row.metadata && Object.keys(row.metadata || {}).length > 0 && (
                            <pre className="mt-2 max-h-28 overflow-auto rounded bg-[color-mix(in_srgb,var(--enterprise-primary)_5%,transparent)] p-2 text-[11px] text-[var(--enterprise-foreground)]">
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
        </aside>
      </section>
    </EnterpriseShell>
  );
}
