import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

export async function getAiHeaders(extraHeaders: Record<string, string> = {}) {
  const token = await nhost.auth.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function fetchAiJson(path: string, options: RequestInit = {}) {
  const headers = await getAiHeaders(options.headers as Record<string, string>);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}
