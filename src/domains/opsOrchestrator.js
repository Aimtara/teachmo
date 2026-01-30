import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

// G3 Compliance: JWT Auth with E2E Bypass support
const getHeaders = () => {
  let token = nhost.auth.getAccessToken();

  // If in E2E bypass mode, grab the mock token injected by Playwright
  if (!token && import.meta.env.VITE_E2E_BYPASS_AUTH === 'true') {
    token = window.localStorage.getItem('e2e_mock_token');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

const opsFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
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
