import { API_BASE_URL } from '@/config/api';

export type DomainHttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams | Blob | ArrayBuffer | null;
  json?: unknown;
};

export async function domainFetch(path: string, options: DomainHttpOptions = {}) {
  const { json, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(headers || {}),
    },
    body: json === undefined ? rest.body : JSON.stringify(json),
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
