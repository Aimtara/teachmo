import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRosterRun, listRosterAlerts, retryRosterRun } from '@/domains/integrations/rosterHealth';
import { EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';

const sampleDeadLetters = [
  { id: 'dlq-1', source: 'OneRoster', record: 'student: orphaned guardian', severity: 'high', status: 'retry ready' },
  { id: 'dlq-2', source: 'ClassLink', record: 'class: duplicate section', severity: 'medium', status: 'needs map' },
  { id: 'dlq-3', source: 'Notifications', record: 'weekly digest webhook', severity: 'low', status: 'retry ready' }
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminIntegrationHealth() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deadLetters, setDeadLetters] = useState(sampleDeadLetters);

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId),
    [alerts, selectedAlertId]
  );

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await listRosterAlerts();
      setAlerts(data);
      if (data.length && !selectedAlertId) {
        setSelectedAlertId(data[0].id);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [selectedAlertId]);

  const loadRun = useCallback(async (runId) => {
    if (!runId) return;
    setRunLoading(true);
    setError('');
    try {
      const data = await getRosterRun(runId);
      setSelectedRun(data);
    } catch (err) {
      setError(err?.message || 'Failed to load run.');
    } finally {
      setRunLoading(false);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    if (!selectedAlert?.runId) return;
    setRunLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await retryRosterRun(selectedAlert.runId);
      setSelectedRun(data);
      setSuccess('Retry started.');
      await loadAlerts();
    } catch (err) {
      setError(err?.message || 'Retry failed.');
    } finally {
      setRunLoading(false);
    }
  }, [selectedAlert, loadAlerts]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (selectedAlert?.runId) {
      loadRun(selectedAlert.runId);
    } else {
      setSelectedRun(null);
    }
  }, [selectedAlert, loadRun]);

  return (
    <EnterpriseSurface
      eyebrow="Integration and data health"
      title="Roster sync operations hub"
      description="District IT can configure integrations, reconcile data conflicts, inspect dead-letter events, and retry failed roster or LMS syncs."
      badges={['Self-serve integrations', 'Data reconciliation', 'Dead-letter queue', 'Retry runbooks']}
      metrics={[
        { label: 'Active alerts', value: String(alerts.length), badge: 'Live', trend: alerts.length ? 'down' : 'flat' },
        { label: 'Selected run', value: selectedRun?.status || 'None', badge: 'Diagnostic', trend: 'flat' },
        { label: 'Retry action', value: selectedAlert?.runId ? 'Ready' : 'Select', badge: 'Runbook', trend: 'up' },
        { label: 'Conflict tools', value: 'Mapped', badge: 'Reconcile', trend: 'up' }
      ]}
      aside={
        <EnterprisePanel title="Data operations lanes" description="Readable technical queues for district IT.">
          <EnterpriseWorkflowList
            items={[
              { label: 'Self-serve setup', status: 'Configure', tone: 'info' },
              { label: 'Reconciliation', status: 'Resolve', tone: 'warning' },
              { label: 'Dead-letter queue', status: 'Retry', tone: 'danger' }
            ]}
          />
        </EnterprisePanel>
      }
    >

      {error && <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded">{success}</div>}

      <div className="grid md:grid-cols-[1.2fr_1.8fr] gap-6">
        <section className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Active alerts</h2>
            <button
              type="button"
              onClick={loadAlerts}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {alerts.length === 0 && !loading && (
            <p className="text-sm text-gray-500">No alerts right now.</p>
          )}
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`w-full text-left border rounded p-3 space-y-1 ${
                    selectedAlertId === alert.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{alert.message}</span>
                    <span className="text-xs uppercase tracking-wide text-gray-500">{alert.severity}</span>
                  </div>
                  <div className="text-xs text-gray-500">Created {formatDate(alert.createdAt)}</div>
                  {alert.runId && <div className="text-xs text-gray-500">Run ID: {alert.runId}</div>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Diagnostics</h2>
              <p className="text-sm text-gray-600">Review failed sync details and retry.</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!selectedAlert?.runId || runLoading}
            >
              {runLoading ? 'Retrying…' : 'Retry sync'}
            </button>
          </div>

          {!selectedAlert && <p className="text-sm text-gray-500">Select an alert to view details.</p>}

          {selectedAlert && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
                <div className="font-medium">Alert details</div>
                <div className="text-gray-600">Severity: {selectedAlert.severity}</div>
                <div className="text-gray-600">Source ID: {selectedAlert.sourceId || '—'}</div>
                <div className="text-gray-600">Run ID: {selectedAlert.runId || '—'}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded p-3 space-y-2 text-sm">
                <div className="font-medium">Run diagnostics</div>
                {selectedRun ? (
                  <>
                    <div className="text-gray-600">Status: {selectedRun.status}</div>
                    <div className="text-gray-600">Started: {formatDate(selectedRun.startedAt)}</div>
                    <div className="text-gray-600">Finished: {formatDate(selectedRun.finishedAt)}</div>
                    <div className="text-gray-600">Invalid: {selectedRun.stats?.invalid ?? 0}</div>
                    <div className="text-gray-600">Deactivated: {selectedRun.stats?.deactivated ?? 0}</div>
                    <div className="text-gray-600">Triggered by: {selectedRun.triggeredBy}</div>
                    {selectedRun.errors?.length > 0 && (
                      <div className="text-red-600 text-xs">
                        {selectedRun.errors.map((err, index) => (
                          <div key={`${err.message}-${index}`}>• {err.message}</div>
                        ))}
                      </div>
                    )}
                    {selectedRun.diagnostics && (
                      <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto">
                        {JSON.stringify(selectedRun.diagnostics, null, 2)}
                      </pre>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Loading run details…</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <EnterprisePanel title="Data reconciliation" description="Map conflicts without engineering support before publishing roster changes.">
          <div className="space-y-3">
            {[
              ['Orphaned student', 'Map to guardian profile', 'Ready'],
              ['Duplicate class section', 'Merge SIS and LMS records', 'Needs review'],
              ['Stale enrollment', 'Deactivate after retention check', 'Policy gated']
            ].map(([record, action, state]) => (
              <div key={record} className="rounded-2xl border border-[var(--enterprise-border)] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{record}</p>
                    <p className="text-[var(--enterprise-muted)]">{action}</p>
                  </div>
                  <span className="rounded-full border border-[var(--enterprise-border)] px-3 py-1 text-xs font-semibold">{state}</span>
                </div>
              </div>
            ))}
          </div>
        </EnterprisePanel>
        <EnterprisePanel title="Dead-letter queue" description="Dropped notifications and failed API calls can be retried or routed to reconciliation.">
          <div className="space-y-3">
            {deadLetters.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--enterprise-border)] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.source}</p>
                    <p className="text-[var(--enterprise-muted)]">{item.record}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--enterprise-border)] px-3 py-1 text-xs font-semibold">{item.status}</span>
                    <button
                      type="button"
                      className="enterprise-focus rounded-full bg-[var(--enterprise-primary)] px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => setDeadLetters((rows) => rows.map((row) => row.id === item.id ? { ...row, status: 'retry queued now' } : row))}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </EnterprisePanel>
      </div>
    </EnterpriseSurface>
  );
}
