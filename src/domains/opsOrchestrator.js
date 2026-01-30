import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

const E2E_SESSION_KEY = 'teachmo_e2e_session';

function isE2EBypassEnabled() {
  const flag = String(import.meta.env.VITE_E2E_BYPASS_AUTH || '').toLowerCase() === 'true';
  if (!flag) return false;
  const isTestMode = String(import.meta.env.MODE || '').toLowerCase() === 'test';
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  return isTestMode || isLocalhost;
}

function getE2ESession() {
  try {
    if (!isE2EBypassEnabled()) return null;
    const raw = window.localStorage.getItem(E2E_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function getAccessToken() {
  const e2e = getE2ESession();
  if (e2e?.accessToken) return String(e2e.accessToken);
  return nhost.auth.getAccessToken() || '';
}

const opsFetch = async (path, options = {}) => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Unauthorized: Please log in again.');
  }
  if (response.status === 403) {
    throw new Error('Forbidden: You do not have permission to access Ops tools.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(text || `Ops API error (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const listFamilies = (query = '') => {
  const params = new URLSearchParams({ limit: '100' });
  if (query) params.set('q', query);
  return opsFetch(`/ops/families?${params.toString()}`);
};

export const getFamilyHealth = (familyId) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/health`);

export const listAnomalies = (familyId, status = 'open') => {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.set('status', status);
  }
  const query = params.toString();
  return opsFetch(`/ops/families/${encodeURIComponent(familyId)}/anomalies${query ? `?${query}` : ''}`);
};

export const ackAnomaly = (familyId, anomalyType, note) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/anomalies/${encodeURIComponent(anomalyType)}/ack`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

export const closeAnomaly = (familyId, anomalyType, note) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/anomalies/${encodeURIComponent(anomalyType)}/close`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

export const reopenAnomaly = (familyId, anomalyType, note) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/anomalies/${encodeURIComponent(anomalyType)}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

export const getAlerts = (familyId) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/alerts`);

export const getMitigations = (familyId) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/mitigations`);

export const clearMitigation = (familyId, mitigationType, note) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/mitigations/${encodeURIComponent(mitigationType)}/clear`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

export const getTimeline = (familyId, hours = 48) => {
  const params = new URLSearchParams({ hours: String(hours) });
  return opsFetch(`/ops/families/${encodeURIComponent(familyId)}/timeline?${params.toString()}`);
};

export const checkOpsHealth = () => opsFetch('/ops/health');
