const ORCH_BASE_URL = import.meta.env.VITE_ORCH_API_URL || 'http://localhost:4000';

async function orchFetch(path, opts = {}) {
  const res = await fetch(`${ORCH_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Orchestrator API ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getLatestWeeklyBrief(familyId) {
  return orchFetch(`/api/orchestrator/${encodeURIComponent(familyId)}/briefs/weekly/latest`);
}

export async function runWeeklyBrief(familyId) {
  return orchFetch(`/api/orchestrator/${encodeURIComponent(familyId)}/run-weekly`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
