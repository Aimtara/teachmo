import { API_BASE_URL } from '@/config/api';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type HttpOptions = {
  method?: string;
  body?: Record<string, unknown>;
  actor?: string;
};

function headers(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function http(path: string, { method = 'GET', body, actor }: HttpOptions = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: headers(actor ? { 'x-actor': actor } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const json = await res.json();
      message = json?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

function toQueryString(params: QueryParams = {}): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export function getExecutionBoard() {
  return http('/execution-board/board');
}

export function updateExecutionEpic(id: string, patch: Record<string, unknown>, actor?: string) {
  return http(`/execution-board/epics/${id}`, { method: 'PATCH', body: patch, actor });
}

export function updateExecutionGate(gate: string, patch: Record<string, unknown>, actor?: string) {
  return http(`/execution-board/gates/${gate}`, { method: 'PATCH', body: patch, actor });
}

export function createExecutionSlice(payload: Record<string, unknown>, actor?: string) {
  return http('/execution-board/slices', { method: 'POST', body: payload, actor });
}

export function updateExecutionSlice(id: string, patch: Record<string, unknown>, actor?: string) {
  return http(`/execution-board/slices/${id}`, { method: 'PATCH', body: patch, actor });
}

export function deleteExecutionSlice(id: string, actor?: string) {
  return http(`/execution-board/slices/${id}`, { method: 'DELETE', actor });
}

export function addExecutionDependency(dep: Record<string, unknown>, actor?: string) {
  return http('/execution-board/dependencies', { method: 'POST', body: dep, actor });
}

export function removeExecutionDependency(id: string, actor?: string) {
  return http(`/execution-board/dependencies/${id}`, { method: 'DELETE', actor });
}

export function listExecutionAudit(params: QueryParams = {}) {
  return http(`/execution-board/audit${toQueryString(params)}`);
}

export function createOrchestratorAction(payload: Record<string, unknown>, actor?: string) {
  return http('/execution-board/orchestrator-actions', { method: 'POST', body: payload, actor });
}

export function listOrchestratorActions(params: QueryParams = {}) {
  return http(`/execution-board/orchestrator-actions${toQueryString(params)}`);
}

export function exportExecutionBoardCsv(entity: string) {
  const url = `${API_BASE_URL}/execution-board/export?entity=${encodeURIComponent(entity)}&format=csv`;
  return fetch(url, { headers: headers() })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }
      return res.text();
    })
    .then((csvText) => {
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `teachmo_${entity}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    });
}
