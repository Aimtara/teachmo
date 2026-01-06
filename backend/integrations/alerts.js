/* eslint-env node */
import { createId, integrationStore, nowIso } from './store.js';

export function createAlert({ sourceId, runId, severity = 'warning', message, diagnostics = {} } = {}) {
  const alert = {
    id: createId('alert'),
    sourceId,
    runId,
    severity,
    message: message || 'Roster sync alert',
    diagnostics,
    createdAt: nowIso(),
  };

  integrationStore.alerts.unshift(alert);
  return alert;
}

export function listAlerts() {
  return integrationStore.alerts;
}

export function findAlert(alertId) {
  return integrationStore.alerts.find((item) => item.id === alertId);
}
