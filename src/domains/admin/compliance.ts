import { API_BASE_URL } from '@/config/api';
import { domainJson } from '@/domains/http';

export type AuthHeaders = Record<string, string>;

export function getRetentionPolicy(headers: AuthHeaders) {
  return domainJson('/admin/retention-policy', { headers });
}

export function listDsarExports(headers: AuthHeaders) {
  return domainJson('/admin/dsar-exports', { headers });
}

export function listAIUsageForCompliance(limit: number, headers: AuthHeaders) {
  return domainJson(`/admin/ai/usage?limit=${encodeURIComponent(String(limit))}`, { headers });
}

export function createDsarExport(payload: { userId: string; reason: string }, headers: AuthHeaders) {
  return domainJson('/admin/dsar-exports', {
    method: 'POST',
    headers,
    json: payload,
  });
}

export function hardDeleteUser(userId: string, payload: { reason: string }, headers: AuthHeaders) {
  return domainJson(`/admin/users/${encodeURIComponent(userId)}/hard-delete`, {
    method: 'POST',
    headers,
    json: payload,
  });
}

export function dsarExportDownloadUrl(id: string) {
  return `${API_BASE_URL}/admin/dsar-exports/${encodeURIComponent(id)}/download`;
}
