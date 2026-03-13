const ORCH_BASE_URL = import.meta.env.VITE_ORCH_API_URL;

type OrchestratorError = Error & { status?: number };

type ListActionsOptions = {
  status?: string;
  limit?: number;
};

type FetchOptions = {
  method?: string;
  body?: string;
};

async function orchFetch(path: string, opts: FetchOptions = {}) {
  if (!ORCH_BASE_URL) {
    return null;
  }

  const res = await fetch(`${ORCH_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: OrchestratorError = new Error(`Orchestrator API ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function getLatestWeeklyBrief(familyId: string) {
  if (!ORCH_BASE_URL) return null;
  return orchFetch(`/api/orchestrator/${encodeURIComponent(familyId)}/briefs/weekly/latest`);
}

export async function runWeeklyBrief(familyId: string) {
  if (!ORCH_BASE_URL) return null;
  return orchFetch(`/api/orchestrator/${encodeURIComponent(familyId)}/run-weekly`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function listActions(familyId: string, { status = 'queued', limit = 10 }: ListActionsOptions = {}) {
  if (!ORCH_BASE_URL) return { actions: [] };
  const qs = new URLSearchParams({ status, limit: String(limit) }).toString();
  return orchFetch(`/api/orchestrator/${encodeURIComponent(familyId)}/actions?${qs}`);
}

export async function completeAction(familyId: string, actionId: string) {
  if (!ORCH_BASE_URL) return null;
  return orchFetch(
    `/api/orchestrator/${encodeURIComponent(familyId)}/actions/${encodeURIComponent(actionId)}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

export async function dismissAction(familyId: string, actionId: string) {
  if (!ORCH_BASE_URL) return null;
  return orchFetch(
    `/api/orchestrator/${encodeURIComponent(familyId)}/actions/${encodeURIComponent(actionId)}/dismiss`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}
