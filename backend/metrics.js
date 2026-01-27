/* eslint-env node */
const orchestratorCounters = {
  plansCreated: 0,
  approvalsRequested: 0,
  approvalsApproved: 0,
  approvalsRejected: 0,
  plansExecuted: 0,
  planRunsVerified: 0,
  planRunsFailed: 0,
  rollbacksCreated: 0,
  runbooksStarted: 0,
  runbooksContinued: 0,
  runbooksPaused: 0,
  alertRouteUpserts: 0,
  alertRouteTests: 0,
  escalationPolicyUpserts: 0,
  escalationChecks: 0,
  alertDeliveries: 0
};

const metricsState = {
  startedAt: new Date().toISOString(),
  requestsTotal: 0,
  requestsByStatus: {},
  orchestrator: orchestratorCounters
};

export function metricsMiddleware(req, res, next) {
  metricsState.requestsTotal += 1;
  res.on('finish', () => {
    const status = String(res.statusCode || 0);
    metricsState.requestsByStatus[status] = (metricsState.requestsByStatus[status] || 0) + 1;
  });
  next();
}

export function incrementOrchestratorCounter(counter, amount = 1) {
  if (!Object.prototype.hasOwnProperty.call(metricsState.orchestrator, counter)) {
    metricsState.orchestrator[counter] = 0;
  }
  metricsState.orchestrator[counter] += amount;
}

export function getMetricsSnapshot() {
  return {
    startedAt: metricsState.startedAt,
    requestsTotal: metricsState.requestsTotal,
    requestsByStatus: { ...metricsState.requestsByStatus },
    orchestrator: { ...metricsState.orchestrator }
  };
}

export function resetMetrics() {
  metricsState.startedAt = new Date().toISOString();
  metricsState.requestsTotal = 0;
  metricsState.requestsByStatus = {};
  Object.keys(metricsState.orchestrator).forEach((key) => {
    metricsState.orchestrator[key] = 0;
  });
}
