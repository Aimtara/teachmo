import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, Shield, ShieldAlert } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  ackAnomaly,
  clearMitigation,
  closeAnomaly,
  getAlerts,
  getFamilyHealth,
  getMitigations,
  getTimeline,
  listAnomalies,
  listFamilies,
  reopenAnomaly,
} from '@/domains/opsOrchestrator';

const OPS_ADMIN_KEY = import.meta.env.VITE_OPS_ADMIN_KEY || '';

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
  const [statusFilter, setStatusFilter] = useState('open');
  const [timelineHours, setTimelineHours] = useState('48');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialogNote, setDialogNote] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, anomalyType: '', action: '' });
  const queryClient = useQueryClient();

  const familiesQuery = useQuery({
    queryKey: ['ops-families', search],
    queryFn: () => listFamilies(search.trim()),
  });

  const familyId = selectedFamilyId || familiesQuery.data?.families?.[0]?.id || '';

  const healthQuery = useQuery({
    queryKey: ['ops-health', familyId],
    enabled: Boolean(familyId),
    queryFn: () => getFamilyHealth(familyId),
  });

  const anomaliesQuery = useQuery({
    queryKey: ['ops-anomalies', familyId, statusFilter],
    enabled: Boolean(familyId),
    queryFn: () => listAnomalies(familyId, statusFilter),
  });

  const mitigationQuery = useQuery({
    queryKey: ['ops-mitigation', familyId],
    enabled: Boolean(familyId),
    queryFn: () => getMitigations(familyId),
  });

  const alertsQuery = useQuery({
    queryKey: ['ops-alerts', familyId],
    enabled: Boolean(familyId),
    queryFn: () => getAlerts(familyId),
  });

  const timelineQuery = useQuery({
    queryKey: ['ops-timeline', familyId, timelineHours],
    enabled: Boolean(familyId),
    queryFn: () => getTimeline(familyId, Number(timelineHours) || 48),
  });

  const runAnomalyAction = async (action, anomalyType, note) => {
    setActionMessage('');
    setActionError('');
    if (!familyId) return;

    try {
      const trimmedNote = note?.trim() || undefined;
      if (action === 'ack') {
        await ackAnomaly(familyId, anomalyType, trimmedNote);
      } else if (action === 'close') {
        await closeAnomaly(familyId, anomalyType, trimmedNote);
      } else if (action === 'reopen') {
        await reopenAnomaly(familyId, anomalyType, trimmedNote);
      }
      setActionMessage(`${action} complete for ${anomalyType}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops-anomalies', familyId] }),
        queryClient.invalidateQueries({ queryKey: ['ops-timeline', familyId] }),
      ]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleClearMitigation = async (mitigationType) => {
    if (!familyId) return;
    setActionMessage('');
    setActionError('');
    try {
      await clearMitigation(familyId, mitigationType);
      setActionMessage(`Mitigation ${mitigationType} cleared.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ops-mitigation', familyId] }),
        queryClient.invalidateQueries({ queryKey: ['ops-timeline', familyId] }),
      ]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Mitigation clear failed');
    }
  };

  const daily = healthQuery.data?.daily;
  const hourly = healthQuery.data?.hourly || [];
  const anomalies = anomaliesQuery.data?.anomalies || [];
  const mitigations = mitigationQuery.data?.mitigations || (mitigationQuery.data?.mitigation ? [mitigationQuery.data.mitigation] : []);
  const alerts = alertsQuery.data?.alerts || [];
  const timeline = timelineQuery.data || {};

  const timelineBuckets = useMemo(() => {
    const buckets = new Map();
    const toHourKey = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      date.setMinutes(0, 0, 0);
      return date.toISOString();
    };

    (timeline.hourlyRows || timeline.hourly || []).forEach((row) => {
      const key = toHourKey(row.hour || row.hour_start || row.timestamp);
      if (!key) return;
      buckets.set(key, { key, snapshot: row, events: [] });
    });

    (timeline.events || []).forEach((event) => {
      const key = toHourKey(event.timestamp || event.created_at || event.occurred_at || event.time);
      if (!key) return;
      if (!buckets.has(key)) buckets.set(key, { key, snapshot: null, events: [] });
      buckets.get(key).events.push(event);
    });

    return Array.from(buckets.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [timeline]);

  const anomalyStatusVariant = (status) => {
    if (status === 'open') return 'destructive';
    if (status === 'acknowledged') return 'secondary';
    if (status === 'closed') return 'outline';
    return 'secondary';
  };

  const renderEventLabel = (event) => {
    const eventType = event.event_type || event.type || event.kind || event.action || 'event';
    const anomalyType = event.anomaly_type || event.anomalyType;
    if (anomalyType || eventType.includes('anomaly')) {
      const action = event.action || event.status || eventType.replace('anomaly_', '');
      return `${action || 'anomaly'} • ${anomalyType || 'unknown'}`;
    }
    if (eventType.includes('alert') || event.endpoint_type) {
      return `alert delivery • ${event.severity || '—'} • ${event.status || '—'}`;
    }
    if (eventType.includes('mitigation') || event.mitigation_type) {
      return `mitigation • ${event.status || event.state || eventType}`;
    }
    return eventType;
  };

  const renderEventMeta = (event) => {
    const note = event.note || event.status_note;
    const actor = event.actor || event.actor_id || event.acknowledged_by || event.closed_by;
    const detail = event.endpoint_type ? `${event.endpoint_type}${event.endpoint_target ? ` (${event.endpoint_target})` : ''}` : '';
    return [actor ? `by ${actor}` : null, note ? `note: ${note}` : null, detail || null]
      .filter(Boolean)
      .join(' • ');
  };

  return (
    <ProtectedRoute allowedRoles={['system_admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Ops Orchestrator Timeline</h1>
          <p className="text-sm text-gray-600">Acknowledge and close anomalies with timeline context.</p>
        </header>

        {!OPS_ADMIN_KEY && (
          <Card>
            <CardHeader>
              <CardTitle>Missing Ops Admin Key</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Set <span className="font-mono">VITE_OPS_ADMIN_KEY</span> to enable ops API access. Requests will be forbidden
              until the key is configured.
            </CardContent>
          </Card>
        )}

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
                ) : familiesQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Failed to load families: {familiesQuery.error?.message || 'Unknown error'}
                  </p>
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
                  ) : healthQuery.isError ? (
                    <p className="text-red-600">
                      Failed to load health: {healthQuery.error?.message || 'Unknown error'}
                    </p>
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
                  ) : mitigationQuery.isError ? (
                    <p className="text-red-600">
                      Failed to load mitigations: {mitigationQuery.error?.message || 'Unknown error'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {mitigations.length === 0 ? (
                        <p className="text-gray-500">No mitigations reported.</p>
                      ) : (
                        mitigations.map((mitigation) => (
                          <div key={mitigation.type || mitigation.id || mitigation.name} className="rounded border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {mitigation.active ? (
                                  <ShieldAlert className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Shield className="h-4 w-4 text-emerald-500" />
                                )}
                                <span className="font-medium">{mitigation.type || mitigation.name || 'Mitigation'}</span>
                              </div>
                              <Badge variant={mitigation.active ? 'destructive' : 'outline'}>
                                {mitigation.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              Updated: {formatDateTime(mitigation.updated_at)}
                            </div>
                            <pre className="mt-2 rounded bg-gray-50 p-3 text-xs text-gray-700">
                              {JSON.stringify(mitigation.params || {}, null, 2)}
                            </pre>
                            <Button
                              className="mt-3"
                              variant="outline"
                              onClick={() => handleClearMitigation(mitigation.type || mitigation.name || 'default')}
                            >
                              Force clear
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Anomalies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={() => anomaliesQuery.refetch()}>
                    Refresh anomalies
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>First seen</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomaliesQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-red-600">
                          Failed to load anomalies: {anomaliesQuery.error?.message || 'Unknown error'}
                        </TableCell>
                      </TableRow>
                    ) : anomalies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-muted-foreground">
                          No anomalies found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      anomalies.map((row) => (
                        <TableRow key={row.anomaly_type}>
                          <TableCell className="font-mono text-xs">{row.anomaly_type}</TableCell>
                          <TableCell>
                            <Badge variant={anomalyStatusVariant(row.status)} className="capitalize">
                              {row.status || 'open'}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.severity || '—'}</TableCell>
                          <TableCell>{formatDateTime(row.first_seen)}</TableCell>
                          <TableCell>{formatDateTime(row.last_seen)}</TableCell>
                          <TableCell>{row.count ?? '—'}</TableCell>
                          <TableCell className="space-x-2">
                            {row.status === 'open' && (
                              <>
                                <Button size="sm" onClick={() => setActionDialog({ open: true, anomalyType: row.anomaly_type, action: 'ack' })}>
                                  Acknowledge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setActionDialog({ open: true, anomalyType: row.anomaly_type, action: 'close' })
                                  }
                                >
                                  Close
                                </Button>
                              </>
                            )}
                            {row.status === 'acknowledged' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setActionDialog({ open: true, anomalyType: row.anomaly_type, action: 'close' })}
                                >
                                  Close
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setActionDialog({ open: true, anomalyType: row.anomaly_type, action: 'reopen' })
                                  }
                                >
                                  Reopen
                                </Button>
                              </>
                            )}
                            {row.status === 'closed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActionDialog({ open: true, anomalyType: row.anomaly_type, action: 'reopen' })}
                              >
                                Reopen
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {actionMessage && <p className="text-sm text-emerald-600">{actionMessage}</p>}
                {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Deliveries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {alertsQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Loading alerts...</p>
                ) : alertsQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Failed to load alerts: {alertsQuery.error?.message || 'Unknown error'}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Last delivery</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-sm text-muted-foreground">
                            No alert deliveries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        alerts.map((alert) => (
                          <TableRow key={alert.id || `${alert.endpoint_type}-${alert.endpoint_target}`}>
                            <TableCell>{alert.endpoint_type || alert.type || '—'}</TableCell>
                            <TableCell>{alert.status || '—'}</TableCell>
                            <TableCell>{alert.severity || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {alert.endpoint_target || alert.target || '—'}
                            </TableCell>
                            <TableCell>{formatDateTime(alert.last_delivered_at || alert.updated_at)}</TableCell>
                            <TableCell>{alert.count ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Timeline</CardTitle>
                  <p className="text-sm text-gray-600">
                    Hourly snapshots correlated with anomalies, alerts, and mitigation changes.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="timeline-hours">Hours</Label>
                    <Input
                      id="timeline-hours"
                      type="number"
                      min="1"
                      max="168"
                      value={timelineHours}
                      onChange={(event) => setTimelineHours(event.target.value)}
                      className="w-[110px]"
                    />
                  </div>
                  <Button variant="outline" onClick={() => timelineQuery.refetch()}>
                    Refresh timeline
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {timelineQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Loading timeline...</p>
                ) : timelineQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Failed to load timeline: {timelineQuery.error?.message || 'Unknown error'}
                  </p>
                ) : timelineBuckets.length === 0 ? (
                  <p className="text-sm text-gray-500">No timeline data available.</p>
                ) : (
                  <div className="space-y-4">
                    {timelineBuckets.map((bucket) => {
                      const hourLabel = new Date(bucket.key).toLocaleString();
                      const snapshot = bucket.snapshot || {};
                      return (
                        <div key={bucket.key} className="rounded border border-gray-200 p-4">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-gray-500" />
                            <p className="font-medium">{hourLabel}</p>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Signals</p>
                              <p>{formatValue(snapshot.signals)}</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Ingests</p>
                              <p>{formatValue(snapshot.ingests)}</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Duplicates</p>
                              <p>{formatValue(snapshot.duplicates)}</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Suppressed</p>
                              <p>{formatValue(snapshot.suppressed)}</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Actions created</p>
                              <p>{formatValue(snapshot.actions_created)}</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="text-xs text-gray-500">Actions completed</p>
                              <p>{formatValue(snapshot.actions_completed)}</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            {bucket.events.length === 0 ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <AlertCircle className="h-4 w-4" />
                                No correlated events.
                              </div>
                            ) : (
                              bucket.events.map((event, index) => (
                                <div key={`${bucket.key}-${index}`} className="rounded border border-gray-100 bg-white p-3 text-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-medium">{renderEventLabel(event)}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDateTime(event.timestamp || event.created_at || event.occurred_at || event.time)}
                                    </span>
                                  </div>
                                  {renderEventMeta(event) && (
                                    <p className="mt-1 text-xs text-gray-500">{renderEventMeta(event)}</p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </div>
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) setDialogNote('');
          setActionDialog((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action ? `${actionDialog.action.toUpperCase()} anomaly` : 'Update anomaly'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              Add an operator note for <span className="font-mono">{actionDialog.anomalyType}</span>.
            </p>
            <Textarea
              value={dialogNote}
              onChange={(event) => setDialogNote(event.target.value)}
              placeholder="Optional note"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogNote('');
                setActionDialog({ open: false, anomalyType: '', action: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const { action, anomalyType } = actionDialog;
                setActionDialog({ open: false, anomalyType: '', action: '' });
                await runAnomalyAction(action, anomalyType, dialogNote);
                setDialogNote('');
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
