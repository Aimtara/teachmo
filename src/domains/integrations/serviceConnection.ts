import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

async function authHeaders() {
  const token = await nhost.auth.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function requestServiceAuth(serviceKey: string) {
  const res = await fetch(`${API_BASE_URL}/integrations/${encodeURIComponent(serviceKey)}/auth`, {
    method: 'POST',
    headers: await authHeaders(),
  });

  if (!res.ok) {
    return { authUrl: `https://${serviceKey}.com/login?mock=true` };
  }

  return res.json();
}

export const startIntegrationAuth = requestServiceAuth;

export async function disconnectService(serviceKey: string) {
  const response = await fetch(`${API_BASE_URL}/integrations/${encodeURIComponent(serviceKey)}/disconnect`, {
    method: 'POST',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect service');
  }

  return response.json().catch(() => ({}));
}

export const disconnectIntegrationService = disconnectService;
