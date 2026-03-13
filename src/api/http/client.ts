import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';
import type { HttpRequestOptions, TenantScope } from '@/types/api';

export async function authHeaders(tenant?: TenantScope, extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);

  return headers;
}

export async function requestJson<T>(
  url: string,
  options: HttpRequestOptions,
  tenant?: TenantScope,
  queueOfflineMutations = false
): Promise<T> {
  const headers = await authHeaders(tenant, options.headers);

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (options.method === 'HEAD') return {} as T;
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (err) {
    if (
      queueOfflineMutations
      && options.method
      && options.method !== 'GET'
      && typeof navigator !== 'undefined'
      && navigator.onLine === false
    ) {
      await enqueueRequest({
        url,
        method: options.method,
        headers,
        body: typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined,
      });
      return { queued: true } as T;
    }

    throw err;
  }
}

export async function requestBlob(url: string, tenant?: TenantScope, options: HttpRequestOptions = {}): Promise<Blob> {
  const headers = await authHeaders(tenant, options.headers);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
