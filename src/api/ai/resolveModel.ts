import { fetchAiJson } from './client';

export type ResolveModelResponse = {
  allowed: boolean;
  model: string;
  reason?: string;
  estimatedCost?: number;
  budgetExceeded?: boolean;
  policy?: {
    defaultModel?: string | null;
    fallbackModel?: string | null;
  } | null;
  budget?: {
    monthlyLimitUsd?: number | null;
    spentUsd?: number | null;
    fallbackPolicy?: string | null;
    resetAt?: string | null;
  } | null;
  prompt?: {
    id: string;
    name?: string | null;
    version_id?: string | null;
    content?: string | null;
    variables?: Record<string, unknown>;
  } | null;
};

type ResolveModelPayload = {
  preferredModel?: string;
  estimatedTokens?: number;
  featureFlags?: Record<string, boolean>;
  promptId?: string | null;
};

export async function resolveAiModel(payload: ResolveModelPayload): Promise<ResolveModelResponse> {
  return fetchAiJson('/ai/resolve-model', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
