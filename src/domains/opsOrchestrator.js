import { API_BASE_URL } from '@/config/api';

const OPS_ADMIN_KEY = import.meta.env.VITE_OPS_ADMIN_KEY || '';

const opsFetch = async (path, { headers, ...options } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPS_ADMIN_KEY ? { 'x-ops-admin-key': OPS_ADMIN_KEY } : {}),
      ...headers,
    },
    ...options,
  });

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
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/mitigation`);

export const clearMitigation = (familyId, mitigationType, note) =>
  opsFetch(`/ops/families/${encodeURIComponent(familyId)}/mitigation/clear`, {
    method: 'POST',
    body: JSON.stringify({ mitigationType, note }),
  });

export const getTimeline = (familyId, hours = 48) => {
  const params = new URLSearchParams({ hours: String(hours) });
  return opsFetch(`/ops/families/${encodeURIComponent(familyId)}/timeline?${params.toString()}`);
};
