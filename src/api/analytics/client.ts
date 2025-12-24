import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';

export type TenantScope = {
  organizationId: string;
  schoolId?: string | null;
};

export type AnalyticsFilters = {
  start?: string;
  end?: string;
  role?: string | null;
  childId?: string | null;
  schoolId?: string | null;
};

async function authHeaders(tenant?: TenantScope) {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);
  return headers;
}

async function request<T>(path: string, options: RequestInit, tenant?: TenantScope): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const headers = await authHeaders(tenant);
  try {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (options.method === 'HEAD') return {} as T;
    if (options.method && options.method !== 'GET' && res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (err) {
    if (options.method && options.method !== 'GET' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueRequest({
        url,
        method: options.method,
        headers,
        body: typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined,
      });
      return { queued: true } as any;
    }
    throw err;
  }
}

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
  return request(`/analytics/summary${buildQuery(filters)}`, { method: 'GET' }, tenant);
}

export async function fetchDrilldown(tenant: TenantScope, metricKey: string, filters: AnalyticsFilters = {}) {
  const query = buildQuery({ ...filters });
  const suffix = query ? `${query}&metric=${encodeURIComponent(metricKey)}` : `?metric=${encodeURIComponent(metricKey)}`;
  return request(`/analytics/drilldown${suffix}`, { method: 'GET' }, tenant);
}

export async function exportAnalyticsCsv(tenant: TenantScope, filters: AnalyticsFilters = {}) {
  const base = getApiBaseUrl();
  const url = `${base}/analytics/export.csv${buildQuery(filters)}`;
  const headers = await authHeaders(tenant);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export async function exportAnalyticsPdf(tenant: TenantScope, filters: AnalyticsFilters = {}) {
  const base = getApiBaseUrl();
  const url = `${base}/analytics/export.pdf${buildQuery(filters)}`;
  const headers = await authHeaders(tenant);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export async function runReport(tenant: TenantScope, definition: any, filters: AnalyticsFilters = {}) {
  return request('/analytics/report', { method: 'POST', body: JSON.stringify({ definition, filters }) }, tenant);
}

export async function exportReportCsv(tenant: TenantScope, definition: any, filters: AnalyticsFilters = {}) {
  const base = getApiBaseUrl();
  const url = `${base}/analytics/report/export.csv`;
  const headers = await authHeaders(tenant);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ definition, filters })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export async function exportReportPdf(tenant: TenantScope, definition: any, filters: AnalyticsFilters = {}) {
  const base = getApiBaseUrl();
  const url = `${base}/analytics/report/export.pdf`;
  const headers = await authHeaders(tenant);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ definition, filters })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
