import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Bell, Clock, ShieldCheck, Signal, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/config/api';
import { useTenant } from '@/contexts/TenantContext';
import { nhost } from '@/lib/nhostClient';

const METRIC_OPTIONS = [
  { value: 'api_error_rate', label: 'API error rate' },
  { value: 'api_latency_p95', label: 'API latency (p95)' },
  { value: 'ai_cost_usd', label: 'AI cost (USD)' },
  { value: 'notification_bounce_rate', label: 'Notification bounce rate' },
];

const REPORT_OPTIONS = [
  { value: 'metrics_summary', label: 'Metrics summary' },
  { value: 'error_trends', label: 'Error rate trends' },
  { value: 'ai_usage', label: 'AI usage' },
];

const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

export default function AdminObservability() {
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const [range, setRange] = useState(() => {
    const end = new Date();
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });
  const [alertForm, setAlertForm] = useState({
    name: '',
    metricKey: 'api_error_rate',
    comparison: 'gt',
    threshold: '0.05',
    windowMinutes: '60',
    channel: 'email',
    anomaly: false,
  });
  const [reportForm, setReportForm] = useState({
    name: '',
    reportType: 'metrics_summary',
    frequency: 'weekly',
    channel: 'email',
  });

  const headersQuery = useQuery({
    queryKey: ['observability-headers', tenant.organizationId, tenant.schoolId],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenant.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
      if (tenant.schoolId) headers['x-teachmo-school-id'] = tenant.schoolId;
      return headers;
    },
    enabled: !tenant.loading,
  });

  const summaryQuery = useQuery({
    queryKey: ['observability-summary', range, headersQuery.data],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => {
      const params = new URLSearchParams({
        start: `${range.start}T00:00:00.000Z`,
        end: `${range.end}T23:59:59.999Z`,
      });
      const response = await fetch(`${API_BASE_URL}/admin/observability/summary?${params.toString()}`, {
        headers: headersQuery.data,
      });
      if (!response.ok) throw new Error('Failed to load observability summary');
      return response.json();
    },
  });

  const alertsQuery = useQuery({
    queryKey: ['observability-alerts', headersQuery.data],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/observability/alerts`, { headers: headersQuery.data });
      if (!response.ok) throw new Error('Failed to load alerts');
      return response.json();
    },
  });

  const reportsQuery = useQuery({
    queryKey: ['observability-reports', headersQuery.data],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/observability/reports`, { headers: headersQuery.data });
      if (!response.ok) throw new Error('Failed to load reports');
      return response.json();
    },
  });

  const apiSummary = summaryQuery.data?.api?.summary || {};
  const aiSummary = summaryQuery.data?.ai || {};
  const notificationSummary = summaryQuery.data?.notifications || {};
  const errorTrend = summaryQuery.data?.errorTrend || [];

  const errorRate = useMemo(() => {
    if (!apiSummary.total) return 0;
    return Number(apiSummary.errors || 0) / Number(apiSummary.total || 1);
  }, [apiSummary.errors, apiSummary.total]);

  const deliveryRate = useMemo(() => {
    if (!notificationSummary.total_events) return 0;
    return Number(notificationSummary.delivered || 0) / Number(notificationSummary.total_events || 1);
  }, [notificationSummary]);

  const bounceRate = useMemo(() => {
    if (!notificationSummary.total_events) return 0;
    return Number(notificationSummary.bounced || 0) / Number(notificationSummary.total_events || 1);
  }, [notificationSummary]);

  const submitAlert = async (event) => {
    event.preventDefault();
    if (!headersQuery.data) return;
    const payload = {
      ...alertForm,
      threshold: alertForm.threshold ? Number(alertForm.threshold) : null,
      windowMinutes: alertForm.windowMinutes ? Number(alertForm.windowMinutes) : 60,
    };
    const response = await fetch(`${API_BASE_URL}/admin/observability/alerts`, {
      method: 'POST',
      headers: headersQuery.data,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create alert');
    setAlertForm((prev) => ({ ...prev, name: '' }));
    await queryClient.invalidateQueries({ queryKey: ['observability-alerts'] });
  };

  const runAlerts = async () => {
    if (!headersQuery.data) return;
    await fetch(`${API_BASE_URL}/admin/observability/alerts/run`, {
      method: 'POST',
      headers: headersQuery.data,
    });
    await queryClient.invalidateQueries({ queryKey: ['observability-alerts'] });
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!headersQuery.data) return;
    const response = await fetch(`${API_BASE_URL}/admin/observability/reports`, {
      method: 'POST',
      headers: headersQuery.data,
      body: JSON.stringify(reportForm),
    });
    if (!response.ok) throw new Error('Failed to create report');
    setReportForm((prev) => ({ ...prev, name: '' }));
    await queryClient.invalidateQueries({ queryKey: ['observability-reports'] });
  };

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Observability & Alerts</h1>
        <p className="text-gray-600">Track latency, error rates, AI usage, and notifications.</p>
      </header>

      <section className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="range-start">Start date</Label>
          <Input
            id="range-start"
            type="date"
            value={range.start}
            onChange={(event) => setRange((prev) => ({ ...prev, start: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="range-end">End date</Label>
          <Input
            id="range-end"
            type="date"
            value={range.end}
            onChange={(event) => setRange((prev) => ({ ...prev, end: event.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => summaryQuery.refetch()}>
            Refresh metrics
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Signal className="h-4 w-4 text-blue-500" />
              API latency (p95)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{Math.round(apiSummary.p95_latency || 0)} ms</div>
            <div className="text-sm text-gray-500">Average {Math.round(apiSummary.avg_latency || 0)} ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <TrendingDown className="h-4 w-4 text-red-500" />
              API error rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatPercent(errorRate)}</div>
            <div className="text-sm text-gray-500">{apiSummary.errors || 0} errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              AI usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{aiSummary.ai_calls || 0} calls</div>
            <div className="text-sm text-gray-500">Avg latency {Math.round(aiSummary.avg_latency || 0)} ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Bell className="h-4 w-4 text-indigo-500" />
              Notification delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatPercent(deliveryRate)}</div>
            <div className="text-sm text-gray-500">Bounce rate {formatPercent(bounceRate)}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Error rate trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorTrend}>
                <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(0, 10)} />
                <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                <Tooltip formatter={(value) => formatPercent(value)} />
                <Line type="monotone" dataKey="error_rate" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API latency trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryQuery.data?.api?.trend || []}>
                <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(0, 10)} />
                <YAxis tickFormatter={(value) => `${Math.round(value)} ms`} />
                <Tooltip formatter={(value) => `${Math.round(value)} ms`} />
                <Line type="monotone" dataKey="p95_latency" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alert rules
            </CardTitle>
            <Button variant="outline" size="sm" onClick={runAlerts}>
              Run now
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitAlert} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="alert-name">Rule name</Label>
                <Input
                  id="alert-name"
                  value={alertForm.name}
                  onChange={(event) => setAlertForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="API error spike"
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Metric</Label>
                  <Select
                    value={alertForm.metricKey}
                    onValueChange={(value) => setAlertForm((prev) => ({ ...prev, metricKey: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Comparison</Label>
                  <Select
                    value={alertForm.comparison}
                    onValueChange={(value) => setAlertForm((prev) => ({ ...prev, comparison: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">Greater than</SelectItem>
                      <SelectItem value="gte">Greater than or equal</SelectItem>
                      <SelectItem value="lt">Less than</SelectItem>
                      <SelectItem value="lte">Less than or equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="alert-threshold">Threshold</Label>
                  <Input
                    id="alert-threshold"
                    value={alertForm.threshold}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, threshold: event.target.value }))}
                    placeholder="0.05"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="alert-window">Window (minutes)</Label>
                  <Input
                    id="alert-window"
                    value={alertForm.windowMinutes}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, windowMinutes: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Channel</Label>
                  <Select
                    value={alertForm.channel}
                    onValueChange={(value) => setAlertForm((prev) => ({ ...prev, channel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Anomaly detection</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      checked={alertForm.anomaly}
                      onChange={(event) => setAlertForm((prev) => ({ ...prev, anomaly: event.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-600">Trigger on spikes vs last week</span>
                  </div>
                </div>
              </div>
              <Button type="submit">Create alert rule</Button>
            </form>

            <div className="space-y-2">
              {(alertsQuery.data?.rules || []).map((rule) => (
                <div key={rule.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-gray-500">
                      {rule.metric_key} · {rule.window_minutes}m · {rule.enabled ? 'enabled' : 'disabled'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{rule.channel?.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Scheduled reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitReport} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="report-name">Report name</Label>
                <Input
                  id="report-name"
                  value={reportForm.name}
                  onChange={(event) => setReportForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Weekly admin summary"
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Report type</Label>
                  <Select
                    value={reportForm.reportType}
                    onValueChange={(value) => setReportForm((prev) => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Frequency</Label>
                  <Select
                    value={reportForm.frequency}
                    onValueChange={(value) => setReportForm((prev) => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Channel</Label>
                  <Select
                    value={reportForm.channel}
                    onValueChange={(value) => setReportForm((prev) => ({ ...prev, channel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit">Schedule report</Button>
            </form>

            <div className="space-y-2">
              {(reportsQuery.data?.reports || []).map((report) => (
                <div key={report.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-500">
                      {report.report_type} · {report.frequency} · next {report.next_run_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{report.channel?.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">AI tokens</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{aiSummary.tokens || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">AI cost (USD)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${Number(aiSummary.cost_usd || 0).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{notificationSummary.total_events || 0}</CardContent>
        </Card>
      </section>
    </div>
  );
}
