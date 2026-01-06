import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

function toDateOnly(isoString) {
  if (!isoString) return null;
  return isoString.slice(0, 10);
}

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[\n\r,\"]/g.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export default function AdminAnalytics() {
  const { data: scope } = useTenantScope();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventName, setEventName] = useState('all');
  const [actorRole, setActorRole] = useState('all');
  const [drillEventName, setDrillEventName] = useState(null);

  const headersQuery = useQuery({
    queryKey: ['analytics-ai-token'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const aiUsageQuery = useQuery({
    queryKey: ['analytics-ai-usage-summary'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/ai/usage-summary`, { headers: headersQuery.data });
      if (!response.ok) throw new Error('Failed to load AI usage summary');
      return response.json();
    },
  });

  const rollupWhere = useMemo(() => {
    const where = {
      day: { _gte: from, _lte: to },
    };

    // Tenant scope:
    // - district_id is always included when present
    // - school_id optional
    if (scope?.districtId) where.district_id = { _eq: scope.districtId };
    if (scope?.schoolId) where.school_id = { _eq: scope.schoolId };
    if (eventName !== 'all') where.event_name = { _eq: eventName };

    return where;
  }, [from, to, scope?.districtId, scope?.schoolId, eventName]);

  const rollupsQuery = useQuery({
    queryKey: ['analytics-rollups', rollupWhere],
    enabled: Boolean(scope?.districtId),
    queryFn: async () => {
      const data = await graphql(
        `query Rollups($where: analytics_event_rollups_daily_bool_exp!) {
          analytics_event_rollups_daily(
            where: $where,
            order_by: [{ day: desc }, { event_count: desc }],
            limit: 500
          ) {
            day
            event_name
            district_id
            school_id
            event_count
          }
        }`,
        { where: rollupWhere }
      );
      return data?.analytics_event_rollups_daily ?? [];
    },
  });

  const drillWhere = useMemo(() => {
    if (!drillEventName) return null;

    const where = {
      event_ts: { _gte: `${from}T00:00:00.000Z`, _lte: `${to}T23:59:59.999Z` },
      event_name: { _eq: drillEventName },
    };
    if (scope?.districtId) where.district_id = { _eq: scope.districtId };
    if (scope?.schoolId) where.school_id = { _eq: scope.schoolId };
    if (actorRole !== 'all') where.metadata = { _contains: { actor_role: actorRole } };

    return where;
  }, [drillEventName, from, to, scope?.districtId, scope?.schoolId, actorRole]);

  const drillQuery = useQuery({
    queryKey: ['analytics-drill', drillWhere],
    enabled: Boolean(drillWhere),
    queryFn: async () => {
      const data = await graphql(
        `query Drill($where: analytics_events_bool_exp!) {
          analytics_events(
            where: $where,
            order_by: { event_ts: desc },
            limit: 200
          ) {
            id
            event_ts
            event_name
            actor_user_id
            entity_type
            entity_id
            metadata
          }
        }`,
        { where: drillWhere }
      );
      return data?.analytics_events ?? [];
    },
  });

  const uniqueEventNames = useMemo(() => {
    const s = new Set();
    for (const r of rollupsQuery.data ?? []) s.add(r.event_name);
    return Array.from(s).sort();
  }, [rollupsQuery.data]);

  const exportRollupsCsv = () => {
    const rows = rollupsQuery.data ?? [];
    const header = ['day', 'event_name', 'district_id', 'school_id', 'event_count'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        csvEscape(r.day),
        csvEscape(r.event_name),
        csvEscape(r.district_id ?? ''),
        csvEscape(r.school_id ?? ''),
        csvEscape(r.event_count ?? 0),
      ].join(','));
    }
    downloadText(`teachmo_analytics_rollups_${from}_${to}.csv`, lines.join('\n'), 'text/csv');
  };

  const exportDrillCsv = () => {
    const rows = drillQuery.data ?? [];
    const header = ['event_ts', 'event_name', 'actor_user_id', 'entity_type', 'entity_id', 'metadata'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        csvEscape(r.event_ts),
        csvEscape(r.event_name),
        csvEscape(r.actor_user_id ?? ''),
        csvEscape(r.entity_type ?? ''),
        csvEscape(r.entity_id ?? ''),
        csvEscape(JSON.stringify(r.metadata ?? {})),
      ].join(','));
    }
    downloadText(`teachmo_analytics_events_${drillEventName}_${from}_${to}.csv`, lines.join('\n'), 'text/csv');
  };

  const exportPdf = () => {
    // Lightweight, dependency-free PDF via the browser print dialog.
    const html = `
      <html>
        <head>
          <title>Teachmo Analytics Export</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 8px; }
            h2 { font-size: 14px; margin: 18px 0 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
            th { text-align: left; background: #f6f6f6; }
            .meta { color: #555; font-size: 12px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Teachmo Analytics Export</h1>
          <div class="meta">Range: ${from} → ${to}</div>
          <h2>Rollups (daily)</h2>
          <table>
            <thead>
              <tr><th>Day</th><th>Event</th><th>District</th><th>School</th><th>Count</th></tr>
            </thead>
            <tbody>
              ${(rollupsQuery.data ?? [])
                .map(
                  (r) =>
                    `<tr><td>${r.day}</td><td>${r.event_name}</td><td>${r.district_id ?? ''}</td><td>${r.school_id ?? ''}</td><td>${r.event_count ?? 0}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
          ${drillEventName ? `
            <h2>Drilldown: ${drillEventName}</h2>
            <table>
              <thead>
                <tr><th>Time</th><th>User</th><th>Entity</th><th>Metadata</th></tr>
              </thead>
              <tbody>
                ${(drillQuery.data ?? [])
                  .map(
                    (r) =>
                      `<tr><td>${new Date(r.event_ts).toLocaleString()}</td><td>${r.actor_user_id ?? ''}</td><td>${(r.entity_type ?? '') + (r.entity_id ? ':' + r.entity_id : '')}</td><td><pre style="margin:0; white-space: pre-wrap;">${JSON.stringify(r.metadata ?? {}, null, 2)}</pre></td></tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          ` : ''}
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Tenant-scoped rollups and event drilldowns (event_ts + metadata). Export to CSV or PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportPdf} disabled={rollupsQuery.isLoading}>
            Export PDF
          </Button>
          <Button onClick={exportRollupsCsv} disabled={rollupsQuery.isLoading}>
            Export Rollups CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">From</div>
            <Input type="date" value={from} onChange={(e) => setFrom(toDateOnly(e.target.value))} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">To</div>
            <Input type="date" value={to} onChange={(e) => setTo(toDateOnly(e.target.value))} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Event</div>
            <Select value={eventName} onValueChange={setEventName}>
              <SelectTrigger>
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {uniqueEventNames.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Actor role (drilldown)</div>
            <Select value={actorRole} onValueChange={setActorRole}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daily rollups</CardTitle>
          <div className="text-xs text-muted-foreground">
            {scope?.districtId ? `District: ${scope.districtId}${scope.schoolId ? ` • School: ${scope.schoolId}` : ''}` : 'Loading tenant scope…'}
          </div>
        </CardHeader>
        <CardContent>
          {rollupsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading rollups…</div>
          ) : rollupsQuery.data?.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Day</th>
                    <th className="p-2">Event</th>
                    <th className="p-2">School</th>
                    <th className="p-2">Count</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rollupsQuery.data.map((r) => (
                    <tr key={`${r.day}-${r.event_name}-${r.school_id ?? 'district'}`} className="border-b hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap">{r.day}</td>
                      <td className="p-2">{r.event_name}</td>
                      <td className="p-2 font-mono text-xs">{r.school_id ?? '—'}</td>
                      <td className="p-2 font-semibold">{r.event_count}</td>
                      <td className="p-2">
                        <Button size="sm" variant="secondary" onClick={() => setDrillEventName(r.event_name)}>
                          Drill down
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No events in this range yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Usage Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {aiUsageQuery.isLoading ? (
            <div className="text-muted-foreground">Loading AI usage…</div>
          ) : aiUsageQuery.data?.byModel?.length ? (
            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Total calls</span>
                <span>{aiUsageQuery.data?.totals?.calls ?? 0}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated spend</span>
                <span>${Number(aiUsageQuery.data?.totals?.cost_usd || 0).toFixed(2)}</span>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Model</th>
                      <th className="p-2">Calls</th>
                      <th className="p-2">Tokens</th>
                      <th className="p-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiUsageQuery.data.byModel.map((row) => (
                      <tr key={row.model} className="border-b">
                        <td className="p-2 font-mono text-xs">{row.model || '—'}</td>
                        <td className="p-2">{row.calls}</td>
                        <td className="p-2">{row.tokens ?? 0}</td>
                        <td className="p-2">${Number(row.cost_usd || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No AI usage recorded yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Drilldown {drillEventName ? `• ${drillEventName}` : ''}</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDrillEventName(null)} disabled={!drillEventName}>
              Clear
            </Button>
            <Button onClick={exportDrillCsv} disabled={!drillEventName || drillQuery.isLoading}>
              Export Events CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!drillEventName ? (
            <div className="text-sm text-muted-foreground">Select an event in rollups to drill down.</div>
          ) : drillQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading events…</div>
          ) : drillQuery.data?.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Time</th>
                    <th className="p-2">User</th>
                    <th className="p-2">Entity</th>
                    <th className="p-2">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {drillQuery.data.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="p-2 whitespace-nowrap">{new Date(e.event_ts).toLocaleString()}</td>
                      <td className="p-2 font-mono text-xs">{e.actor_user_id ?? '—'}</td>
                      <td className="p-2 font-mono text-xs">{(e.entity_type ?? '') + (e.entity_id ? `:${e.entity_id}` : '')}</td>
                      <td className="p-2">
                        <pre className="text-xs whitespace-pre-wrap max-w-[720px]">{JSON.stringify(e.metadata ?? {}, null, 2)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No matching events.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
