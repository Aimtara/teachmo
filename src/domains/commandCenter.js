import { API_BASE_URL } from '@/config/api';

export const ORCHESTRATOR_TYPES = {
  RUNBOOK_CREATE: 'RUNBOOK_CREATE',
  ESCALATE: 'ESCALATE',
  ROLLBACK: 'ROLLBACK'
};

async function http(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      message = json?.message || json?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function listCommandCenterActions({ status, type, limit } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (limit) params.set('limit', String(limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return http(`/command-center/actions${suffix}`);
}

export async function getCommandCenterAction(id) {
  return http(`/command-center/actions/${encodeURIComponent(id)}`);
}

export async function createCommandCenterAction({ type, title, payload, actorId }) {
  return http('/command-center/actions', {
    method: 'POST',
    body: {
      type,
      title,
      payload,
      createdBy: actorId ?? null
    }
  });
}

export async function approveCommandCenterAction(id, actorId) {
  return http(`/command-center/actions/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: { actorId: actorId ?? null }
  });
}

export async function executeCommandCenterAction(id, actorId) {
  return http(`/command-center/actions/${encodeURIComponent(id)}/execute`, {
    method: 'POST',
    body: { actorId: actorId ?? null }
  });
}

export async function cancelCommandCenterAction(id, { actorId, reason } = {}) {
  return http(`/command-center/actions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { actorId: actorId ?? null, reason: reason ?? null }
  });
}

export async function listCommandCenterAudit({ limit } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return http(`/command-center/audit${suffix}`);
}

export async function listOrchestratorActions() {
  return listCommandCenterActions();
}

export async function approveAction(id, actorId) {
  return approveCommandCenterAction(id, actorId);
}

export async function cancelAction(id, actorId, reason) {
  return cancelCommandCenterAction(id, { actorId, reason });
}

export async function executeAction(action, actorId) {
  const id = typeof action === 'string' ? action : action?.id;
  if (!id) throw new Error('Missing action id');
  return executeCommandCenterAction(id, actorId);
}
