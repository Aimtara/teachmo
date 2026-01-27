/* eslint-env node */
import crypto from 'crypto';

export const integrationStore = {
  connections: [],
  tokens: [],
  rosterSources: [],
  rosterRuns: [],
  rosterUsers: [],
  iamRules: [],
  alerts: [],
  ltiPlatforms: [],
  ltiSessions: [],
  ltiLaunches: [],
};

export function createId(prefix = 'int') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function resetIntegrationStore() {
  integrationStore.connections.length = 0;
  integrationStore.tokens.length = 0;
  integrationStore.rosterSources.length = 0;
  integrationStore.rosterRuns.length = 0;
  integrationStore.rosterUsers.length = 0;
  integrationStore.iamRules.length = 0;
  integrationStore.alerts.length = 0;
  integrationStore.ltiPlatforms.length = 0;
  integrationStore.ltiSessions.length = 0;
  integrationStore.ltiLaunches.length = 0;
}

export function nowIso() {
  return new Date().toISOString();
}

export function clampString(value, max = 2000) {
  if (typeof value !== 'string') return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
