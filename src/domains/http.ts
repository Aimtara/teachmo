import { API_BASE_URL } from '@/config/api';

export type ApiHeaders = Record<string, string>;

export type DomainHttpOptions = {
  method?: string;
  headers?: ApiHeaders;
  body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | Record<string, unknown> | null;
  json?: unknown;
};

export async function domainFetch(path: string, options: DomainHttpOptions = {}) {
  const { json, headers, ...rest } = options;
  const shouldJsonEncode =
    json !== undefined ||
    (rest.body !== undefined &&
      rest.body !== null &&
      typeof rest.body === 'object' &&
      !(rest.body instanceof FormData) &&
      !(rest.body instanceof URLSearchParams) &&
      !(rest.body instanceof Blob) &&
      !(rest.body instanceof ArrayBuffer));
  const body = json !== undefined ? json : rest.body;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(shouldJsonEncode ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: shouldJsonEncode ? JSON.stringify(body) : (body as string | FormData | URLSearchParams | Blob | ArrayBuffer | null | undefined),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed (${response.status})`);
  }

  return response;
}

export async function domainJson<T = unknown>(path: string, options: DomainHttpOptions = {}): Promise<T> {
  const response = await domainFetch(path, options);
  return response.json() as Promise<T>;
}

export const apiFetchJson = domainJson;
export const apiJson = domainJson;

export type ApiRequestOptions = Omit<DomainHttpOptions, 'json'> & {
  apiBaseUrl?: string;
  body?: DomainHttpOptions['body'] | Record<string, unknown>;
};

export async function apiRequest<T = unknown>(
  path: string,
  { apiBaseUrl = API_BASE_URL, body, headers, ...rest }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      ...(body && !(typeof body === 'string') ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body && typeof body !== 'string' ? JSON.stringify(body) : body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
