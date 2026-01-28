import { API_BASE_URL } from '@/config/api';

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_API_KEY;

function headers(extra = {}) {
  const h = {
    'Content-Type': 'application/json',
    ...extra
  };
  if (INTERNAL_KEY) h['x-internal-key'] = INTERNAL_KEY;
  return h;
}

async function http(path, { method = 'GET', body, actor } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: headers(actor ? { 'x-actor': actor } : {}),
    body: body ? JSON.stringify(body) : undefined
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

export function getExecutionBoard() {
  return http('/execution-board/board');
}

export function updateExecutionEpic(id, patch, actor) {
  return http(`/execution-board/epics/${id}`, { method: 'PATCH', body: patch, actor });
}

export function updateExecutionGate(gate, patch, actor) {
  return http(`/execution-board/gates/${gate}`, { method: 'PATCH', body: patch, actor });
}

export function createExecutionSlice(payload, actor) {
  return http('/execution-board/slices', { method: 'POST', body: payload, actor });
}

export function updateExecutionSlice(id, patch, actor) {
  return http(`/execution-board/slices/${id}`, { method: 'PATCH', body: patch, actor });
}

export function deleteExecutionSlice(id, actor) {
  return http(`/execution-board/slices/${id}`, { method: 'DELETE', actor });
}

export function addExecutionDependency(dep, actor) {
  return http('/execution-board/dependencies', { method: 'POST', body: dep, actor });
}

export function removeExecutionDependency(id, actor) {
  return http(`/execution-board/dependencies/${id}`, { method: 'DELETE', actor });
}

export function listExecutionAudit(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return http(`/execution-board/audit${qs ? `?${qs}` : ''}`);
}

export function createOrchestratorAction(payload, actor) {
  return http('/execution-board/orchestrator-actions', { method: 'POST', body: payload, actor });
}

export function listOrchestratorActions(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return http(`/execution-board/orchestrator-actions${qs ? `?${qs}` : ''}`);
}

export function exportExecutionBoardCsv(entity) {
  // Use fetch so we can include the internal key header when enabled.
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
