import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Shield, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/data-table';

const OPS_ADMIN_KEY = import.meta.env.VITE_OPS_ADMIN_KEY || '';

const fetchJson = async (url, opts = {}) => {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  return value;
};

export default function OpsOrchestrator() {
  const [search, setSearch] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(OPS_ADMIN_KEY ? { 'x-ops-admin-key': OPS_ADMIN_KEY } : {}),
    }),
    []
  );

  const familiesQuery = useQuery({
    queryKey: ['ops-families', search],
    enabled: Boolean(OPS_ADMIN_KEY),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('q', search.trim());
      return fetchJson(`${API_BASE_URL}/ops/families?${params.toString()}`, { headers });
    },
  });

  const familyId = selectedFamilyId || familiesQuery.data?.families?.[0]?.id || '';

  const healthQuery = useQuery({
    queryKey: ['ops-health', familyId],
    enabled: Boolean(OPS_ADMIN_KEY && familyId),
    queryFn: () => fetchJson(`${API_BASE_URL}/ops/families/${familyId}/health`, { headers }),
  });

  const anomaliesQuery = useQuery({
    queryKey: ['ops-anomalies', familyId],
    enabled: Boolean(OPS_ADMIN_KEY && familyId),
    queryFn: () =>
      fetchJson(`${API_BASE_URL}/ops/families/${familyId}/anomalies?status=open&limit=50`, { headers }),
  });

  const alertsQuery = useQuery({
    queryKey: ['ops-alerts', familyId],
    enabled: Boolean(OPS_ADMIN_KEY && familyId),
    queryFn: () => fetchJson(`${API_BASE_URL}/ops/families/${familyId}/alerts?limit=50`, { headers }),
  });

  const mitigationQuery = useQuery({
    queryKey: ['ops-mitigation', familyId],
    enabled: Boolean(OPS_ADMIN_KEY && familyId),
    queryFn: () => fetchJson(`${API_BASE_URL}/ops/families/${familyId}/mitigation`, { headers }),
  });

  const runAction = async (action, payload) => {
    setActionMessage('');
    setActionError('');
    if (!familyId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ops/families/${familyId}/${action}`, {
        method: 'POST',
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Action failed');
      }
      const data = await response.json();
      setActionMessage(`${action.replace('-', ' ')} complete.`);
      await Promise.all([
        alertsQuery.refetch(),
        mitigationQuery.refetch(),
      ]);
      return data;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
      return null;
    }
  };

  const daily = healthQuery.data?.daily;
  const hourly = healthQuery.data?.hourly || [];
  const anomalies = anomaliesQuery.data?.anomalies || [];
  const deliveries = alertsQuery.data?.deliveries || [];
  const mitigation = mitigationQuery.data?.mitigation;

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Ops Orchestrator</h1>
          <p className="text-sm text-gray-600">
            Internal ops view for orchestrator health, anomalies, alert deliveries, and mitigation controls.
          </p>
        </header>

        {!OPS_ADMIN_KEY ? (
          <Card>
            <CardHeader>
              <CardTitle>Missing Ops Admin Key</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Set <span className="font-mono">VITE_OPS_ADMIN_KEY</span> to enable ops API access.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Families</CardTitle>
                  <p className="text-sm text-gray-600">Search and select a family to inspect.</p>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search family id or name"
                  className="md:max-w-xs"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {familiesQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Loading families...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(familiesQuery.data?.families || []).map((family) => (
                      <Button
                        key={family.id}
                        variant={family.id === familyId ? 'default' : 'outline'}
                        onClick={() => setSelectedFamilyId(family.id)}
                      >
                        {family.name || family.id}
                      </Button>
                    ))}
                    {familiesQuery.data?.families?.length === 0 && (
                      <p className="text-sm text-gray-500">No families found.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Health Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {healthQuery.isLoading ? (
                    <p className="text-gray-500">Loading health...</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">Day</p>
                          <p>{formatValue(daily?.day)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Signals</p>
                          <p>{formatValue(daily?.signals)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ingests</p>
                          <p>{formatValue(daily?.ingests)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duplicates</p>
                          <p>{formatValue(daily?.duplicates)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Actions Created</p>
                          <p>{formatValue(daily?.actions_created)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Actions Completed</p>
                          <p>{formatValue(daily?.actions_completed)}</p>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-500">Today (hourly rollup)</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                          {hourly.map((row) => (
                            <div key={row.hour} className="rounded border px-2 py-1">
                              <p className="font-medium">{new Date(row.hour).getHours()}:00</p>
                              <p>Signals: {row.signals}</p>
                              <p>Ingests: {row.ingests}</p>
                              <p>Suppressed: {row.suppressed}</p>
                            </div>
                          ))}
                          {hourly.length === 0 && <span className="text-gray-500">No hourly data.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mitigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {mitigationQuery.isLoading ? (
                    <p className="text-gray-500">Loading mitigation...</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {mitigation?.active ? (
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="font-medium">
                          {mitigation?.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Updated: {formatDateTime(mitigation?.updated_at)}
                      </div>
                      <pre className="rounded bg-gray-50 p-3 text-xs text-gray-700">
                        {JSON.stringify(mitigation?.params || {}, null, 2)}
                      </pre>
                      <Button
                        variant="outline"
                        onClick={() => runAction('mitigation/clear')}
                      >
                        Force clear mitigation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Open Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table
                    columns={[
                      { Header: 'Type', accessor: 'anomaly_type' },
                      { Header: 'Severity', accessor: 'severity' },
                      { Header: 'Count', accessor: 'count' },
                      {
                        Header: 'Last seen',
                        accessor: (row) => formatDateTime(row.last_seen),
                      },
                    ]}
                    data={anomalies}
                  />
                  {anomalies.length === 0 && (
                    <p className="mt-3 text-sm text-gray-500">No open anomalies.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Deliveries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table
                    columns={[
                      { Header: 'Status', accessor: 'status' },
                      { Header: 'Severity', accessor: 'severity' },
                      { Header: 'Endpoint', accessor: (row) => row.endpoint_type || '—' },
                      { Header: 'Response', accessor: (row) => row.response_code ?? '—' },
                      { Header: 'Sent', accessor: (row) => formatDateTime(row.created_at) },
                    ]}
                    data={deliveries}
                  />
                  {deliveries.length === 0 && (
                    <p className="text-sm text-gray-500">No deliveries recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test Alert Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => runAction('test-alert', { severity: 'warn' })}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Test warn
                  </Button>
                  <Button variant="secondary" onClick={() => runAction('test-alert', { severity: 'error' })}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Test error
                  </Button>
                </div>
                {actionMessage && <p className="text-sm text-emerald-600">{actionMessage}</p>}
                {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
