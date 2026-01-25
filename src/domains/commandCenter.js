import { API_BASE_URL } from '@/config/api';

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_API_KEY || '';

const commandCenterFetch = async (path, { actorId, headers, ...options } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {}),
      ...(actorId ? { 'x-actor': actorId } : {}),
      ...headers,
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(text || `Command Center error (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const ORCHESTRATOR_TYPES = {
  RUNBOOK_CREATE: 'runbook_create',
  ESCALATE: 'escalate',
  ROLLBACK: 'rollback',
};

const normalizeAction = (row) => {
  const payload = row.payload ?? row.action_json ?? null;
  const epic =
    row.epic ??
    payload?.epic ??
    (row.entityId || row.entity_id
      ? {
          code: row.entityId || row.entity_id,
          title: payload?.title ?? payload?.epicTitle ?? null,
          tag: payload?.tag ?? null,
        }
      : null);

  return {
    id: row.id,
    status: row.status,
    type: row.type ?? row.actionType ?? row.action_type,
    created_at: row.created_at ?? row.createdAt ?? null,
    payload,
    result: row.result ?? payload?.result ?? null,
    error: row.error ?? payload?.error ?? null,
    epic,
    runbooks: row.runbooks ?? payload?.runbooks ?? [],
    escalations: row.escalations ?? payload?.escalations ?? [],
    rollbacks: row.rollbacks ?? payload?.rollbacks ?? [],
  };
};

export const listOrchestratorActions = async () => {
  const data = await commandCenterFetch('/execution-board/orchestrator-actions?limit=200');
  const rows = data?.orchestrator_actions ?? data?.rows ?? [];
  return { orchestrator_actions: rows.map(normalizeAction) };
};

export const approveAction = (actionId, actorId) =>
  commandCenterFetch(`/execution-board/orchestrator-actions/${encodeURIComponent(actionId)}/approve`, {
    method: 'POST',
    actorId,
  });

export const cancelAction = (actionId, actorId) =>
  commandCenterFetch(`/execution-board/orchestrator-actions/${encodeURIComponent(actionId)}/cancel`, {
    method: 'POST',
    actorId,
  });

export const executeAction = (action, actorId) =>
  commandCenterFetch(`/execution-board/orchestrator-actions/${encodeURIComponent(action.id)}/execute`, {
    method: 'POST',
    actorId,
    body: JSON.stringify({ action }),
  });
