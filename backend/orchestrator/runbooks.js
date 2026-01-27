/* eslint-env node */
import crypto from 'crypto';
import { orchestratorRunbookRuns, orchestratorApprovals, nextId } from '../models.js';
import { incrementOrchestratorCounter } from '../metrics.js';

const RUNBOOKS = [
  {
    key: 'duplicate-storm',
    name: 'Duplicate Storm',
    description: 'Handle sudden spikes of duplicate alerts and throttle noise.',
    steps: [
      { id: 'triage', title: 'Triage inbound duplicate volume', action: 'investigate', requiresApproval: false },
      { id: 'mitigation', title: 'Apply duplicate suppression', action: 'mitigation.set', requiresApproval: true },
      { id: 'throttle', title: 'Raise throttling', action: 'throttle.raise', requiresApproval: true },
      { id: 'verify', title: 'Verify suppression & recovery', action: 'verify', requiresApproval: false }
    ]
  },
  {
    key: 'sync-failure',
    name: 'Sync Failure',
    description: 'Recover from ingestion or sync pipeline failures.',
    steps: [
      { id: 'diagnose', title: 'Diagnose sync error', action: 'investigate', requiresApproval: false },
      { id: 'mitigation', title: 'Pause non-critical ingest', action: 'mitigation.set', requiresApproval: true },
      { id: 'retry', title: 'Retry sync jobs', action: 'retry', requiresApproval: false },
      { id: 'verify', title: 'Verify ingest recovery', action: 'verify', requiresApproval: false }
    ]
  }
];

const cloneSteps = (steps) =>
  steps.map((step) => ({
    ...step,
    status: 'pending'
  }));

const findPendingApproval = (runId) =>
  orchestratorApprovals.find(
    (approval) => approval.runbookRunId === runId && approval.status === 'pending'
  );

const requestApproval = ({ runId, step, actor }) => {
  const approval = {
    id: nextId('orchestratorApproval'),
    runbookRunId: runId,
    planId: null,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    requestedBy: actor || null,
    stepId: step.id,
    stepTitle: step.title
  };
  orchestratorApprovals.push(approval);
  incrementOrchestratorCounter('approvalsRequested');
  return approval;
};

const advanceRun = (run, actor) => {
  while (run.currentStepIndex < run.steps.length) {
    const step = run.steps[run.currentStepIndex];
    if (step.requiresApproval) {
      step.status = 'awaiting_approval';
      run.status = 'paused';
      run.pausedAt = new Date().toISOString();
      run.pendingApprovalId = findPendingApproval(run.id)?.id ?? requestApproval({ runId: run.id, step, actor }).id;
      incrementOrchestratorCounter('runbooksPaused');
      return run;
    }
    step.status = 'completed';
    run.currentStepIndex += 1;
  }

  run.status = 'completed';
  run.completedAt = new Date().toISOString();
  return run;
};

export function listRunbooks() {
  return RUNBOOKS;
}

export function startRunbook(runbookKey, actor = null) {
  const def = RUNBOOKS.find((r) => r.key === runbookKey);
  if (!def) return null;

  const run = {
    id: crypto.randomUUID(),
    runbookKey: def.key,
    runbookName: def.name,
    status: 'running',
    createdAt: new Date().toISOString(),
    currentStepIndex: 0,
    steps: cloneSteps(def.steps),
    requestedBy: actor
  };

  orchestratorRunbookRuns.push(run);
  incrementOrchestratorCounter('runbooksStarted');
  return advanceRun(run, actor);
}

export function continueRunbook(runId, { approved = true, actor = null } = {}) {
  const run = orchestratorRunbookRuns.find((r) => r.id === runId);
  if (!run) return null;

  if (run.status !== 'paused') {
    return run;
  }

  const approval = findPendingApproval(runId);
  if (approval) {
    approval.status = approved ? 'approved' : 'rejected';
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = actor;
    incrementOrchestratorCounter(approved ? 'approvalsApproved' : 'approvalsRejected');
  }

  const step = run.steps[run.currentStepIndex];
  if (!approved) {
    step.status = 'rejected';
    run.status = 'cancelled';
    run.cancelledAt = new Date().toISOString();
    return run;
  }

  step.status = 'approved';
  run.currentStepIndex += 1;
  run.pendingApprovalId = null;
  incrementOrchestratorCounter('runbooksContinued');
  return advanceRun(run, actor);
}

export function listRunbookRuns() {
  return orchestratorRunbookRuns;
}
