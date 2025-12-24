import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { fetchSummary, fetchDrilldown, exportAnalyticsCsv, exportAnalyticsPdf } from '@/api/analytics/client';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import FiltersBar from '@/components/admin/analytics/FiltersBar';
import MetricCards from '@/components/admin/analytics/MetricCards';
import DrilldownDrawer from '@/components/admin/analytics/DrilldownDrawer';
import ReportBuilder from '@/components/admin/analytics/ReportBuilder';

function defaultFilters() {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    role: 'all',
    childId: '',
    schoolId: ''
  };
}

export default function AdminAnalytics() {
  const { isAuthenticated } = useAuthenticationStatus();
  const tenant = useTenant();
  const { toast } = useToast();
  const [filters, setFilters] = useState(defaultFilters());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const [drilldownRows, setDrilldownRows] = useState([]);

  const scope = useMemo(
    () => ({ organizationId: tenant.organizationId || '', schoolId: tenant.schoolId || null }),
    [tenant.organizationId, tenant.schoolId]
  );

  const normalizedFilters = useMemo(
    () => ({
      ...filters,
      role: filters.role === 'all' ? null : filters.role,
      childId: filters.childId || null,
      schoolId: filters.schoolId || null
    }),
    [filters]
  );

  async function loadSummary(nextFilters = normalizedFilters) {
    if (!scope.organizationId) return;
    setLoading(true);
    try {
      const res = await fetchSummary(scope, nextFilters);
      setSummary(res);
    } catch (err) {
      toast({ title: 'Failed to load analytics', description: String(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || tenant.loading) return;
    if (!scope.organizationId) return;
    loadSummary();
  }, [isAuthenticated, tenant.loading, scope.organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDrilldown(metricKey) {
    if (!scope.organizationId) return;
    setDrilldownMetric(metricKey);
    setDrilldownOpen(true);
    try {
      const res = await fetchDrilldown(scope, metricKey, normalizedFilters);
      setDrilldownRows(res.rows || []);
    } catch (err) {
      toast({ title: 'Failed to load drilldown', description: String(err) });
    }
  }

  async function handleExport(kind) {
    try {
      const blob = kind === 'csv'
        ? await exportAnalyticsCsv(scope, normalizedFilters)
        : await exportAnalyticsPdf(scope, normalizedFilters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'csv' ? 'teachmo-analytics.csv' : 'teachmo-analytics.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Export failed', description: String(err) });
    }
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (tenant.loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading tenant…</div>;
  if (!scope.organizationId) return <div className="p-6 text-center text-sm text-destructive">Missing tenant scope.</div>;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Admin analytics</h1>
        <p className="text-gray-600">District rollups, AI safety telemetry, and exportable reports.</p>
      </header>

      <FiltersBar
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          loadSummary({
            ...next,
            role: next.role === 'all' ? null : next.role,
            childId: next.childId || null,
            schoolId: next.schoolId || null
          });
        }}
        onReset={() => {
          const defaults = defaultFilters();
          setFilters(defaults);
          loadSummary({
            ...defaults,
            role: null,
            childId: null,
            schoolId: null
          });
        }}
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <>
          <MetricCards metrics={summary?.metrics} ai={summary?.ai} onSelect={handleDrilldown} />

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">District rollup by school</h2>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => handleExport('pdf')}
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">School</th>
                    <th className="px-3 py-2 text-left font-medium">Events</th>
                    <th className="px-3 py-2 text-left font-medium">Active users</th>
                    <th className="px-3 py-2 text-left font-medium">Messages sent</th>
                    <th className="px-3 py-2 text-left font-medium">AI calls</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.rollups?.by_school || []).map((row) => (
                    <tr key={row.school_id || 'district'} className="border-t">
                      <td className="px-3 py-2">{row.school_id || 'District'}</td>
                      <td className="px-3 py-2">{row.events}</td>
                      <td className="px-3 py-2">{row.active_users}</td>
                      <td className="px-3 py-2">{row.messages_sent}</td>
                      <td className="px-3 py-2">{row.ai_calls}</td>
                    </tr>
                  ))}
                  {!(summary?.rollups?.by_school || []).length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                        No events yet for this district.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <ReportBuilder tenant={scope} filters={normalizedFilters} />
        </>
      )}

      <DrilldownDrawer
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        metricKey={drilldownMetric}
        rows={drilldownRows}
        onExportCsv={() => handleExport('csv')}
        onExportPdf={() => handleExport('pdf')}
      />
    </div>
  );
}
