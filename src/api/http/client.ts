import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';
import type { HttpRequestOptions, TenantScope } from '@/types/api';

const MAX_ERROR_BODY_SIZE = 16 * 1024; // 16 KB — safety limit for error body reads
const MAX_ERROR_BODY_PREVIEW = 200;    // chars to include in HttpError.bodyPreview

/**
 * Thrown by requestJson / requestBlob on non-2xx responses.
 *
 * `.message`     — stable, user-safe: `"HTTP 422"`.
 * `.status`      — HTTP status code.
 * `.bodyPreview` — up to 200 chars of the response body (text/JSON only, empty
 *                  when the body is binary or large), intended for logs only.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly bodyPreview: string;

  constructor(status: number, bodyPreview: string) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.bodyPreview = bodyPreview;
  }
}

/**
 * Reads a capped, text-like error body from a non-OK Response and returns an
 * HttpError.  Binary or oversized bodies are never buffered; their metadata is
 * recorded in bodyPreview instead.
 */
async function buildHttpError(res: Response): Promise<HttpError> {
  const contentType = res.headers.get('content-type') ?? '';
  const contentLengthHeader = res.headers.get('content-length');

  const isTextLike =
    contentType.startsWith('text/') ||
    contentType.includes('json') ||
    contentType.includes('xml') ||
    contentType.includes('html');

  const declaredLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
  const isWithinSizeLimit = Number.isNaN(declaredLength) || declaredLength <= MAX_ERROR_BODY_SIZE;

  let bodyPreview = '';
  if (isTextLike && isWithinSizeLimit) {
    const text = await res.text().catch(() => '');
    bodyPreview = text.slice(0, MAX_ERROR_BODY_PREVIEW);
  } else if (contentType || contentLengthHeader) {
    const meta: string[] = [];
    if (contentType) meta.push(`content-type=${contentType}`);
    if (contentLengthHeader) meta.push(`content-length=${contentLengthHeader}`);
    bodyPreview = `[body not read; ${meta.join(', ')}]`;
  }

  return new HttpError(res.status, bodyPreview);
}

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
      throw await buildHttpError(res);
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
  if (!res.ok) throw await buildHttpError(res);
  return res.blob();
}
