/* eslint-env node */
export const partnerPrograms = [];
export const trainingCourses = [];
export const trainingModules = [];
export const courseEnrollments = [];
export const onboardingTasks = [];
export const partnerTaskProgress = [];
export const incentives = [];
export const incentiveApplications = [];
export const partnerContracts = [];
export const partnerSubmissionAudits = [];
export const partnerSubmissions = [];
export const userActivity = [];
export const messageLogs = [];
export const automationRuns = [];
export const aiLogs = [];
export const telemetryLogs = [];
export const orchestratorPlans = [];
export const orchestratorApprovals = [];
export const orchestratorRuns = [];
export const orchestratorRunbooks = [];
export const orchestratorRunbookRuns = [];
export const orchestratorAlertRoutes = [];
export const orchestratorEscalationPolicies = [];
export const orchestratorAlertDeliveries = [];
export const executionEpics = [];
export const executionGates = [];
export const executionSlices = [];
export const executionDependencies = [];

let counters = {
  program: 1,
  course: 1,
  module: 1,
  enrollment: 1,
  task: 1,
  progress: 1,
  incentive: 1,
  application: 1,
  contract: 1,
  audit: 1,
  submission: 1,
  activity: 1,
  message: 1,
  automation: 1,
  ai: 1,
  telemetry: 1,
  orchestratorPlan: 1,
  orchestratorApproval: 1,
  orchestratorRun: 1,
  orchestratorRunbook: 1,
  orchestratorRunbookRun: 1,
  orchestratorAlertRoute: 1,
  orchestratorEscalationPolicy: 1,
  orchestratorAlertDelivery: 1,
  executionEpic: 1,
  executionSlice: 1,
  executionDependency: 1,
};

export const nextId = (key) => counters[key]++;
