/* eslint-env node */
import crypto from 'crypto';
import * as models from '../models.js';
import { incrementOrchestratorCounter } from '../metrics.js';

interface RunbookStep {
  id: string;
  title: string;
  action: string;
  requiresApproval: boolean;
  status?: string;
}

interface RunbookDefinition {
  key: string;
  name: string;
  description: string;
  steps: RunbookStep[];
}

interface RunbookRun {
  id: string;
  runbookKey: string;
  runbookName: string;
  status: string;
  createdAt: string;
  currentStepIndex: number;
  steps: RunbookStep[];
  requestedBy: string | null;
  pausedAt?: string;
  pendingApprovalId?: number | null;
  completedAt?: string;
  cancelledAt?: string;
}

interface Approval {
  id: number;
  runbookRunId: string | null;
  planId: string | null;
  status: string;
  requestedAt: string;
  requestedBy: string | null;
  stepId?: string;
  stepTitle?: string;
  resolvedAt?: string;
  resolvedBy?: string | null;
}

const { orchestratorRunbookRuns, orchestratorApprovals, nextId } = models as unknown as {
  orchestratorRunbookRuns: RunbookRun[];
  orchestratorApprovals: Approval[];
  nextId: (name: string) => number;
};

const RUNBOOKS: RunbookDefinition[] = [
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

const cloneSteps = (steps: RunbookStep[]): RunbookStep[] =>
  steps.map((step) => ({
    ...step,
    status: 'pending'
  }));

const findPendingApproval = (runId: string): Approval | undefined =>
  orchestratorApprovals.find(
    (approval) => approval.runbookRunId === runId && approval.status === 'pending'
  );

const requestApproval = ({ runId, step, actor }: { runId: string; step: RunbookStep; actor: string | null }): Approval => {
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

const advanceRun = (run: RunbookRun, actor: string | null): RunbookRun => {
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

export function listRunbooks(): RunbookDefinition[] {
  return RUNBOOKS;
}

export function startRunbook(runbookKey: string, actor: string | null = null): RunbookRun | null {
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

export function continueRunbook(
  runId: string,
  { approved = true, actor = null }: { approved?: boolean; actor?: string | null } = {}
): RunbookRun | null {
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

export function listRunbookRuns(): RunbookRun[] {
  return orchestratorRunbookRuns;
}
