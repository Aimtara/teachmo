import { enqueueRequest } from '@/offline/OfflineStorageManager';
import { API_BASE_URL } from '@/config/api';
import { fetchAiJson, getAiHeaders } from './client';

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
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  promptId?: string | null;
  promptVersionId?: string | null;
  userId?: string | null;
  reviewRequired?: boolean;
  reviewReason?: string | null;
  costUsd?: number | null;
  latencyMs?: number | null;
};

export async function logAiInteraction(_tenant: TenantScope, payload: AiLogPayload) {
  try {
    return await fetchAiJson('/ai/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const headers = await getAiHeaders();
      await enqueueRequest({
        url: `${API_BASE_URL}/ai/log`,
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return { queued: true };
    }
    throw err;
  }
}
