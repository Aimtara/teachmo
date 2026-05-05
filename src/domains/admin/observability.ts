import { domainJson } from '@/domains/http';

export type AdminHeaders = Record<string, string>;

export function getObservabilitySummary(range: { start: string; end: string }, headers: AdminHeaders) {
  const params = new URLSearchParams({
    start: `${range.start}T00:00:00.000Z`,
    end: `${range.end}T23:59:59.999Z`,
  });
  return domainJson(`/admin/observability/summary?${params.toString()}`, { headers });
}

export function listObservabilityAlerts(headers: AdminHeaders) {
  return domainJson('/admin/observability/alerts', { headers });
}

export function listObservabilityReports(headers: AdminHeaders) {
  return domainJson('/admin/observability/reports', { headers });
}

export function createObservabilityAlert(payload: Record<string, unknown>, headers: AdminHeaders) {
  return domainJson('/admin/observability/alerts', { method: 'POST', headers, json: payload });
}

export function runObservabilityAlerts(headers: AdminHeaders) {
  return domainJson('/admin/observability/alerts/run', { method: 'POST', headers });
}

export function createObservabilityReport(payload: Record<string, unknown>, headers: AdminHeaders) {
  return domainJson('/admin/observability/reports', { method: 'POST', headers, json: payload });
}

export const getObservabilityAlerts = listObservabilityAlerts;
export const getObservabilityReports = listObservabilityReports;
