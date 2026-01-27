import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload;
}

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

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId),
    [alerts, selectedAlertId]
  );

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await fetchJson('/integrations/roster/alerts');
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
      const data = await fetchJson(`/integrations/roster/runs/${runId}`);
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
      const data = await fetchJson(`/integrations/roster/runs/${selectedAlert.runId}/retry`, { method: 'POST' });
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Integration Sync Health</h1>
        <p className="text-sm text-gray-600">Monitor SIS/LMS sync alerts, diagnostics, and remediation actions.</p>
      </header>

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
    </div>
  );
}
