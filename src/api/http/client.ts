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
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const detail = body ? `: ${body.slice(0, 200)}` : '';
      throw new Error(`HTTP ${res.status}${detail}`);
    }

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
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    const contentLengthHeader = res.headers.get('content-length');
    const maxErrorBodySize = 16 * 1024; // 16KB safety limit for error bodies

    const isTextLike =
      contentType.startsWith('text/') ||
      contentType.includes('json') ||
      contentType.includes('xml') ||
      contentType.includes('html');

    const declaredLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
    const isWithinSizeLimit = Number.isNaN(declaredLength) || declaredLength <= maxErrorBodySize;

    let detail = '';
    if (isTextLike && isWithinSizeLimit) {
      const body = await res.text().catch(() => '');
      detail = body ? `: ${body.slice(0, 200)}` : '';
    } else if (contentType || contentLengthHeader) {
      // Avoid reading potentially large/binary bodies; include minimal metadata instead.
      const meta: string[] = [];
      if (contentType) meta.push(`content-type=${contentType}`);
      if (contentLengthHeader) meta.push(`content-length=${contentLengthHeader}`);
      detail = meta.length ? `: [error body not read; ${meta.join(', ')}]` : '';
    }
    throw new Error(`HTTP ${res.status}${detail}`);
  }
  return res.blob();
}
