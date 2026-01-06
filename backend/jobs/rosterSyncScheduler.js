/* eslint-env node */
import { runRosterSync } from '../integrations/rosterSync.js';
import { integrationStore } from '../integrations/store.js';
import { createAlert } from '../integrations/alerts.js';

const DEFAULT_INTERVAL_MS = 60000;

function parseCronIntervalMinutes(cron) {
  if (!cron) return null;
  const match = String(cron).match(/\*\/([0-9]+)/);
  if (match) {
    return Number(match[1]);
  }
  return null;
}

export function startRosterSyncScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  setInterval(() => {
    integrationStore.rosterSources.forEach((source) => {
      if (!source.isEnabled || !source.scheduleCron) return;
      const minutes = parseCronIntervalMinutes(source.scheduleCron) || 60;
      const lastRun = source.lastRunAt ? new Date(source.lastRunAt).getTime() : 0;
      if (Date.now() - lastRun < minutes * 60 * 1000) return;
      if (!source.lastPayload) {
        createAlert({
          sourceId: source.id,
          severity: 'warning',
          message: 'Scheduled sync skipped: no payload available.',
          diagnostics: { reason: 'missing_payload' },
        });
        return;
      }
      runRosterSync({
        sourceId: source.id,
        records: source.lastPayload.records || [],
        options: source.lastPayload.options || {},
        triggeredBy: 'scheduled',
      });
    });
  }, intervalMs);
}
