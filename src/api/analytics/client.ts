import { getApiBaseUrl } from '@/config/api';
import { requestBlob, requestJson } from '@/api/http/client';
import type { TenantScope } from '@/types/api';

export type AnalyticsFilters = {
  start?: string;
  end?: string;
  role?: string | null;
  childId?: string | null;
  schoolId?: string | null;
};

export type AnalyticsDefinition = Record<string, unknown>;

function buildQuery(filters: AnalyticsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.role) params.set('role', filters.role);
  if (filters.childId) params.set('childId', filters.childId);
  if (filters.schoolId) params.set('schoolId', filters.schoolId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchSummary(tenant: TenantScope, filters: AnalyticsFilters = {}) {
  return requestJson(`${getApiBaseUrl()}/analytics/summary${buildQuery(filters)}`, { method: 'GET' }, tenant);
}

export async function fetchDrilldown(tenant: TenantScope, metricKey: string, filters: AnalyticsFilters = {}) {
  const query = buildQuery({ ...filters });
  const suffix = query ? `${query}&metric=${encodeURIComponent(metricKey)}` : `?metric=${encodeURIComponent(metricKey)}`;
  return requestJson(`${getApiBaseUrl()}/analytics/drilldown${suffix}`, { method: 'GET' }, tenant);
}

export async function exportAnalyticsCsv(tenant: TenantScope, filters: AnalyticsFilters = {}) {
  return requestBlob(`${getApiBaseUrl()}/analytics/export.csv${buildQuery(filters)}`, tenant);
}

export async function exportAnalyticsPdf(tenant: TenantScope, filters: AnalyticsFilters = {}) {
  return requestBlob(`${getApiBaseUrl()}/analytics/export.pdf${buildQuery(filters)}`, tenant);
}

export async function runReport(tenant: TenantScope, definition: AnalyticsDefinition, filters: AnalyticsFilters = {}) {
  return requestJson(`${getApiBaseUrl()}/analytics/report`, { method: 'POST', body: JSON.stringify({ definition, filters }) }, tenant, true);
}

export async function exportReportCsv(tenant: TenantScope, definition: AnalyticsDefinition, filters: AnalyticsFilters = {}) {
  return requestBlob(`${getApiBaseUrl()}/analytics/report/export.csv`, tenant, {
    method: 'POST',
    body: JSON.stringify({ definition, filters }),
  });
}

export async function exportReportPdf(tenant: TenantScope, definition: AnalyticsDefinition, filters: AnalyticsFilters = {}) {
  return requestBlob(`${getApiBaseUrl()}/analytics/report/export.pdf`, tenant, {
    method: 'POST',
    body: JSON.stringify({ definition, filters }),
  });
}
