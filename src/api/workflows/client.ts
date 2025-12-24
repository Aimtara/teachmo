import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';

export type TenantScope = {
  organizationId: string;
  schoolId?: string | null;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  description?: string | null;
  definition: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

async function authHeaders(tenant?: TenantScope) {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);
  return headers;
}

async function request<T>(path: string, options: RequestInit, tenant?: TenantScope): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const headers = await authHeaders(tenant);
  try {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (err) {
    if (options.method && options.method !== 'GET' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueRequest({
        url,
        method: options.method,
        headers,
        body: typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined,
      });
      return { queued: true } as any;
    }
    throw err;
  }
}

export async function listWorkflows(tenant: TenantScope): Promise<{ workflows: WorkflowDefinition[] }> {
  return request('/workflows', { method: 'GET' }, tenant);
}
export async function createWorkflow(tenant: TenantScope, payload: Partial<WorkflowDefinition>) {
  return request('/workflows', { method: 'POST', body: JSON.stringify(payload) }, tenant);
}
export async function updateWorkflow(tenant: TenantScope, id: string, payload: Partial<WorkflowDefinition>) {
  return request(`/workflows/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }, tenant);
}
export async function deleteWorkflow(tenant: TenantScope, id: string) {
  return request(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' }, tenant);
}
export async function runWorkflow(tenant: TenantScope, id: string, payload: any) {
  return request(`/workflows/${encodeURIComponent(id)}/run`, { method: 'POST', body: JSON.stringify(payload) }, tenant);
}
