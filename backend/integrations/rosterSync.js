/* eslint-env node */
import { createAlert } from './alerts.js';
import { mapExternalRole, resolveIamRule } from './iam.js';
import { clampString, createId, integrationStore, nowIso } from './store.js';

export function listRosterSources() {
  return integrationStore.rosterSources;
}

export function createRosterSource({ connectionId, name, scheduleCron = '', isEnabled = true, iamRuleId = null } = {}) {
  const timestamp = nowIso();
  const source = {
    id: createId('source'),
    connectionId,
    name: name || 'Roster source',
    scheduleCron,
    isEnabled,
    iamRuleId,
    lastRunAt: null,
    lastPayload: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  integrationStore.rosterSources.push(source);
  return source;
}

export function findRosterSource(sourceId) {
  return integrationStore.rosterSources.find((item) => item.id === sourceId);
}

export function listRosterRuns(sourceId) {
  return integrationStore.rosterRuns.filter((run) => run.sourceId === sourceId);
}

export function findRosterRun(runId) {
  return integrationStore.rosterRuns.find((run) => run.id === runId);
}

export function listRosterUsers(sourceId) {
  return integrationStore.rosterUsers.filter((user) => user.sourceId === sourceId);
}

function buildDiagnostics({ invalidRecords, missingRoleMappings, deprovisioned }) {
  return {
    invalidCount: invalidRecords.length,
    missingRoleMappings,
    deprovisioned,
    sampleInvalid: invalidRecords.slice(0, 5),
  };
}

export function runRosterSync({ sourceId, records = [], options = {}, simulateFailure = false, triggeredBy = 'manual' } = {}) {
  const source = findRosterSource(sourceId);
  if (!source) throw new Error('Roster source not found');

  const run = {
    id: createId('run'),
    sourceId,
    status: 'running',
    triggeredBy,
    startedAt: nowIso(),
    finishedAt: null,
    stats: {
      totalRows: Array.isArray(records) ? records.length : 0,
      totalValid: 0,
      invalid: 0,
      upserted: 0,
      deactivated: 0,
    },
    errors: [],
    diagnostics: {},
    payload: {
      records,
      options,
    },
  };

  integrationStore.rosterRuns.unshift(run);
  source.lastPayload = run.payload;

  if (!Array.isArray(records)) {
    run.status = 'failed';
    run.errors.push({ message: 'Records payload must be an array.' });
  } else {
    const rule = resolveIamRule(source.iamRuleId);
    const existingUsers = listRosterUsers(sourceId);
    const seenExternalIds = new Set();
    const invalidRecords = [];
    const missingRoleMappings = [];

    records.forEach((record) => {
      const externalId = record.externalId || record.external_id || record.id;
      const email = record.email;
      if (!externalId || !email) {
        invalidRecords.push({
          externalId: externalId || null,
          email: email || null,
          reason: 'missing_required_fields',
        });
        return;
      }

      const { mappedRole, reason } = mapExternalRole(record.role || record.userRole, rule);
      if (!mappedRole) {
        missingRoleMappings.push({ externalRole: record.role || record.userRole, reason });
        invalidRecords.push({ externalId, email, reason: 'unmapped_role' });
        return;
      }

      seenExternalIds.add(String(externalId));
      run.stats.totalValid += 1;

      const existing = integrationStore.rosterUsers.find(
        (user) => user.sourceId === sourceId && String(user.externalId) === String(externalId)
      );

      if (existing) {
        existing.email = email;
        existing.fullName = record.fullName || record.name || existing.fullName;
        existing.externalRole = record.role || record.userRole || existing.externalRole;
        existing.mappedRole = mappedRole;
        existing.active = true;
        existing.updatedAt = nowIso();
      } else {
        integrationStore.rosterUsers.push({
          id: createId('user'),
          sourceId,
          externalId: String(externalId),
          email,
          fullName: record.fullName || record.name || '',
          externalRole: record.role || record.userRole || '',
          mappedRole,
          active: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      run.stats.upserted += 1;
    });

    const shouldDeactivate = options.deactivateMissing ?? rule?.deprovisionMissing ?? false;
    let deprovisioned = 0;
    if (shouldDeactivate) {
      existingUsers.forEach((user) => {
        if (!seenExternalIds.has(String(user.externalId)) && user.active) {
          user.active = false;
          user.deprovisionedAt = nowIso();
          user.updatedAt = nowIso();
          deprovisioned += 1;
        }
      });
    }

    run.stats.invalid = invalidRecords.length;
    run.stats.deactivated = deprovisioned;
    run.diagnostics = buildDiagnostics({
      invalidRecords,
      missingRoleMappings,
      deprovisioned,
    });

    if (invalidRecords.length > 0) {
      createAlert({
        sourceId,
        runId: run.id,
        severity: 'warning',
        message: `Roster sync completed with ${invalidRecords.length} invalid record(s).`,
        diagnostics: run.diagnostics,
      });
    }
  }

  if (simulateFailure) {
    run.status = 'failed';
    run.errors.push({ message: 'Simulated sync failure for remediation.' });
    createAlert({
      sourceId,
      runId: run.id,
      severity: 'critical',
      message: 'Roster sync failed. Manual remediation required.',
      diagnostics: {
        ...run.diagnostics,
        failureReason: 'simulated',
      },
    });
  }

  run.status = run.status === 'failed' ? 'failed' : 'completed';
  run.finishedAt = nowIso();
  source.lastRunAt = run.finishedAt;
  source.updatedAt = run.finishedAt;

  if (run.errors.length) {
    run.errors = run.errors.map((err) => ({ ...err, message: clampString(err.message) }));
  }

  return run;
}

export function retryRosterRun(runId) {
  const run = findRosterRun(runId);
  if (!run) throw new Error('Run not found');
  return runRosterSync({
    sourceId: run.sourceId,
    records: run.payload?.records || [],
    options: run.payload?.options || {},
    triggeredBy: 'retry',
  });
}
