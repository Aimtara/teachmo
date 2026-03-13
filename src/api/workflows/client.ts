import { getApiBaseUrl } from '@/config/api';
import { requestJson } from '@/api/http/client';
import type { TenantScope } from '@/types/api';

export type WorkflowDefinition = {
  id: string;
  name: string;
  description?: string | null;
  definition: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type WorkflowRunPayload = Record<string, unknown>;

export async function listWorkflows(tenant: TenantScope): Promise<{ workflows: WorkflowDefinition[] }> {
  return requestJson(`${getApiBaseUrl()}/workflows`, { method: 'GET' }, tenant);
}
export async function createWorkflow(tenant: TenantScope, payload: Partial<WorkflowDefinition>) {
  return requestJson(`${getApiBaseUrl()}/workflows`, { method: 'POST', body: JSON.stringify(payload) }, tenant, true);
}
export async function updateWorkflow(tenant: TenantScope, id: string, payload: Partial<WorkflowDefinition>) {
  return requestJson(`${getApiBaseUrl()}/workflows/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }, tenant, true);
}
export async function deleteWorkflow(tenant: TenantScope, id: string) {
  return requestJson(`${getApiBaseUrl()}/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' }, tenant, true);
}
export async function runWorkflow(tenant: TenantScope, id: string, payload: WorkflowRunPayload) {
  return requestJson(`${getApiBaseUrl()}/workflows/${encodeURIComponent(id)}/run`, { method: 'POST', body: JSON.stringify(payload) }, tenant, true);
}
