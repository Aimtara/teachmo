import { API_BASE_URL } from '@/config/api';
import { authHeaders, requestJson } from '@/api/http/client';
import type { HttpRequestOptions } from '@/types/api';

export async function getAiHeaders(extraHeaders: Record<string, string> = {}) {
  return authHeaders(undefined, extraHeaders);
}

export async function fetchAiJson<T = unknown>(path: string, options: HttpRequestOptions = {}) {
  return requestJson<T>(`${API_BASE_URL}${path}`, options);
}
