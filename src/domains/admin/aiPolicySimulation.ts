import { apiRequest } from '@/domains/http';

export type AIPolicySimulationInput = {
  role: string;
  intent: string;
  hasChildData: boolean;
  consentScope: string[];
  guardianVerified: boolean;
  safetyEscalate: boolean;
  actorSchoolId?: string;
  tenantSchoolId?: string;
};

export function simulateAIPolicy(
  apiBaseUrl: string,
  headers: Record<string, string>,
  input: AIPolicySimulationInput,
) {
  return apiRequest('/admin/ai/simulate-policy', {
    apiBaseUrl,
    method: 'POST',
    headers,
    body: input,
  });
}

export const simulateAIPolicyDecision = simulateAIPolicy;
