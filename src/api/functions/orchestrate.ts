import { orchestratorRequestSchema, orchestratorResponseSchema } from '@/lib/orchestrator/schemas';
import type { OrchestratorRequestInput, OrchestratorResponse } from '@/lib/orchestrator/types';
import type { OrchestratorUIAction } from '@/lib/orchestrator/actionRunner';
import { buildUIActionRequest } from '@/lib/orchestrator/actionRunner';
import { HttpError } from '@/utils/apiRetry';

type FetchRequestInit = globalThis.RequestInit;

type InvokeOverrides = FetchRequestInit & { headers?: globalThis.HeadersInit };

const getFunctionsBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined') {
    const url = (import.meta as { env?: Record<string, string> })?.env?.VITE_NHOST_FUNCTIONS_URL;
    if (url) return url;
  }

  if (typeof process !== 'undefined') {
    const url = process.env?.VITE_NHOST_FUNCTIONS_URL;
    if (url) return url;
  }

  return '/v1/functions';
};

const functionsBaseUrl = getFunctionsBaseUrl();

export async function orchestrate(
  payload: OrchestratorRequestInput,
  initOverrides: InvokeOverrides = {}
): Promise<OrchestratorResponse> {
  const parsed = orchestratorRequestSchema.parse(payload);
  const { method = 'POST', headers = {}, ...rest } = initOverrides;
  const normalizedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>)
  };

  const response = await fetch(`${functionsBaseUrl}/orchestrate`, {
    method,
    headers: normalizedHeaders,
    body: JSON.stringify(parsed),
    ...rest
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new HttpError(
      `Nhost function orchestrate failed (${response.status}): ${errorText}`,
      response.status
    );
  }

  const json = (await response.json()) as unknown;
  return orchestratorResponseSchema.parse(json);
}

/**
 * Convenience wrapper for round-tripping orchestrator UI actions.
 * Call this when a user taps a card button emitted by the orchestrator response.
 */
export async function orchestrateAction(
  base: OrchestratorRequestInput,
  action: OrchestratorUIAction
): Promise<OrchestratorResponse> {
  return orchestrate(buildUIActionRequest(base, action));
}
