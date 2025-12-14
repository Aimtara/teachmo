const getFunctionsBaseUrl = () => {
  if (typeof import.meta !== 'undefined') {
    const url = import.meta.env?.VITE_NHOST_FUNCTIONS_URL;
    if (url) return url;
  }

  if (typeof process !== 'undefined') {
    const url = process.env?.VITE_NHOST_FUNCTIONS_URL;
    if (url) return url;
  }

  return '/v1/functions';
};

const functionsBaseUrl = getFunctionsBaseUrl();

const invokeNhostFunction = async (functionName, payload = {}, initOverrides = {}) => {
  const { method = 'POST', headers = {}, ...rest } = initOverrides;

  const requestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...rest
  };

  if (payload && Object.keys(payload).length > 0) {
    requestInit.body = JSON.stringify(payload);
  }

  const response = await fetch(`${functionsBaseUrl}/${functionName}`, requestInit);

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Nhost function ${functionName} failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const createFunctionInvoker = (functionName, defaults) => (payload, initOverrides = {}) =>
  invokeNhostFunction(functionName, payload, { ...defaults, ...initOverrides });

export const googleClassroomSync = createFunctionInvoker('googleClassroomSync');

export const googleAuth = createFunctionInvoker('googleAuth');

export const syncSISData = createFunctionInvoker('syncSISData');

export const bulkUserManagement = createFunctionInvoker('bulkUserManagement');

export const assignDefaultPermissions = createFunctionInvoker('assignDefaultPermissions');

export const getGoogleAuthUrl = createFunctionInvoker('getGoogleAuthUrl');

export const calendarSync = createFunctionInvoker('calendarSync');

export const notificationSettings = createFunctionInvoker('notificationSettings');

export const aiActivitySuggestions = createFunctionInvoker('aiActivitySuggestions');

export const getAdminAnalytics = createFunctionInvoker('getAdminAnalytics');

export const priorityNotifications = createFunctionInvoker('priorityNotifications');

export const eventSubscriptions = createFunctionInvoker('eventSubscriptions');

export const realEventSearch = createFunctionInvoker('realEventSearch');

export const getSchoolIntegrationStatus = createFunctionInvoker('getSchoolIntegrationStatus');

export const submitSchoolParticipationRequest = createFunctionInvoker('submitSchoolParticipationRequest');

export const manageSchoolRequests = createFunctionInvoker('manageSchoolRequests');

export const populateSchoolDirectory = createFunctionInvoker('populateSchoolDirectory');

export const createStripeCheckout = createFunctionInvoker('createStripeCheckout');

export const stripeWebhook = createFunctionInvoker('stripeWebhook');

export const intelligentNotifications = createFunctionInvoker('intelligentNotifications');

export const schoolDirectoryETL = createFunctionInvoker('schoolDirectoryETL');

export const searchSchools = createFunctionInvoker('searchSchools');

export const schoolDirectoryMonitoring = createFunctionInvoker('schoolDirectoryMonitoring');

export const handleGoogleDisconnect = createFunctionInvoker('handleGoogleDisconnect');

export const moderateContent = createFunctionInvoker('moderateContent');

export const submitReport = createFunctionInvoker('submitReport');

export const invokeAdvancedAI = createFunctionInvoker('invokeAdvancedAI');

export const translateMessage = createFunctionInvoker('translateMessage');

export const awardPodChallengePoints = createFunctionInvoker('awardPodChallengePoints');

export const applyReferralCode = createFunctionInvoker('applyReferralCode');

export const manageSponsorships = createFunctionInvoker('manageSponsorships');

export const submitPrivacyRequest = createFunctionInvoker('submitPrivacyRequest');

export const shortsGeneration = createFunctionInvoker('shortsGeneration');

export const shortsAdmin = createFunctionInvoker('shortsAdmin');

export const shortsTelemetry = createFunctionInvoker('shortsTelemetry');

export const shortsRecommendations = createFunctionInvoker('shortsRecommendations');

export const takeModerationAction = createFunctionInvoker('takeModerationAction');

export const advancedAIHomeworkHelper = createFunctionInvoker('advancedAIHomeworkHelper');

export const generateCurriculumAlignedActivities = createFunctionInvoker('generateCurriculumAlignedActivities');

export const manageUserContentReview = createFunctionInvoker('manageUserContentReview');

export const getUXAnalytics = createFunctionInvoker('getUXAnalytics');

export const gamificationEngine = createFunctionInvoker('gamificationEngine');

export const enterpriseAuditLogger = createFunctionInvoker('enterpriseAuditLogger');

export const enterpriseDataExport = createFunctionInvoker('enterpriseDataExport');

export const systemHealthMonitor = createFunctionInvoker('systemHealthMonitor');

export const logAuditEvent = createFunctionInvoker('logAuditEvent');

export const performanceMonitoring = createFunctionInvoker('performanceMonitoring');

