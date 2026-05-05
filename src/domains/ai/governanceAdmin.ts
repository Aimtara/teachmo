import { nhost } from '@/lib/nhostClient';
import { domainJson } from '@/domains/http';
import { API_BASE_URL } from '@/config/api';

export type AuthHeaders = Record<string, string>;

export async function aiAdminHeaders(): Promise<AuthHeaders> {
  const token = await nhost.auth.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAIUsageSummary(headers: AuthHeaders) {
  return domainJson('/admin/ai/usage-summary', { headers });
}

export function getAIReviewQueue(headers: AuthHeaders) {
  return domainJson('/admin/ai/review-queue', { headers });
}

export function getAIPromptLibrary(headers: AuthHeaders) {
  return domainJson('/admin/ai/prompts', { headers });
}

export function getAIBudget(headers: AuthHeaders) {
  return domainJson('/admin/ai/budget', { headers });
}

export function updateAIBudget(payload: { monthlyLimitUsd: number | null; fallbackPolicy: string }, headers: AuthHeaders) {
  return domainJson('/admin/ai/budget', {
    method: 'PUT',
    headers,
    json: payload,
  });
}

export function getAIModelPolicy(headers: AuthHeaders) {
  return domainJson('/admin/ai/model-policy', { headers });
}

export function updateAIModelPolicy(
  payload: {
    defaultModel: string;
    fallbackModel: string;
    allowedModels: string[];
    featureFlags: string[];
  },
  headers: AuthHeaders,
) {
  return domainJson('/admin/ai/model-policy', {
    method: 'PUT',
    headers,
    json: payload,
  });
}

export function getAIGovernanceSummary(days: number, headers: AuthHeaders) {
  return domainJson(`/admin/ai/governance-summary?days=${encodeURIComponent(String(days))}`, { headers });
}

export function getAIGovernanceOutcomes(days: number, headers: AuthHeaders) {
  return domainJson(`/admin/ai/governance-outcomes?days=${encodeURIComponent(String(days))}`, { headers });
}

export function getAIGovernanceBlockedReasons(days: number, headers: AuthHeaders) {
  return domainJson(`/admin/ai/governance-blocked-reasons?days=${encodeURIComponent(String(days))}`, { headers });
}

export function getAIGovernanceSkillUsage(days: number, headers: AuthHeaders) {
  return domainJson(`/admin/ai/governance-skill-usage?days=${encodeURIComponent(String(days))}`, { headers });
}

export function aiGovernanceAuditExportUrl(days: number, format?: 'csv' | 'json') {
  const params = new URLSearchParams({ days: String(days) });
  if (format === 'csv') params.set('format', 'csv');
  return `${API_BASE_URL}/admin/ai/governance-audit-export?${params.toString()}`;
}

export function aiAdminApiBaseUrl() {
  return API_BASE_URL;
}

export function decideAIReviewQueueItem(
  id: string,
  payload: { status: string; reason: string; notes: string },
  headers: AuthHeaders,
) {
  return domainJson(`/admin/ai/review-queue/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    headers,
    json: payload,
  });
}
