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

async function authHeaders() {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

export async function logAiInteraction(_tenant: TenantScope, payload: AiLogPayload) {
  const headers = await authHeaders();
  try {
    const { data, error } = await nhost.functions.call('aiUsageLogger', payload);
    if (error) throw error;
    return data;
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueRequest({
        url: '/functions/aiUsageLogger',
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return { queued: true };
    }
    throw err;
  }
}
