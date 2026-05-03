import { API_BASE_URL } from '@/config/api';

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
};

async function fetchJson(path: string, options: FetchOptions = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload;
}

export async function listRosterAlerts() {
  return fetchJson('/integrations/roster/alerts');
}

export async function getRosterRun(runId: string) {
  return fetchJson(`/integrations/roster/runs/${encodeURIComponent(runId)}`);
}

export async function retryRosterRun(runId: string) {
  return fetchJson(`/integrations/roster/runs/${encodeURIComponent(runId)}/retry`, { method: 'POST' });
}
