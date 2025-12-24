import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';

export type TenantScope = {
  organizationId: string;
  schoolId?: string | null;
};

export type AiLogPayload = {
  prompt: string;
  response: string;
  tokenPrompt?: number;
  tokenResponse?: number;
  tokenTotal?: number;
  safetyRiskScore?: number;
  safetyFlags?: string[];
  model?: string;
  metadata?: Record<string, unknown>;
  childId?: string | null;
};

async function authHeaders(tenant?: TenantScope) {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);
  return headers;
}

export async function logAiInteraction(tenant: TenantScope, payload: AiLogPayload) {
  const base = getApiBaseUrl();
  const url = `${base}/ai/log`;
  const headers = await authHeaders(tenant);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueRequest({
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return { queued: true };
    }
    throw err;
  }
}
