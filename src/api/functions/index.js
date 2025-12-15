// Client-side helpers for calling backend functions.
// These wrappers either proxy to the legacy `src/API/functions.js` module
// or provide lightweight fallbacks used throughout the UI.
import * as legacyFunctions from '../../API/functions.js';

// Re-export existing functions from the legacy module to preserve behaviour.
export const {
  googleClassroomSync,
  googleAuth,
  syncSISData,
  bulkUserManagement,
  assignDefaultPermissions,
  getGoogleAuthUrl,
  calendarSync,
  notificationSettings,
  aiActivitySuggestions,
  getAdminAnalytics,
  priorityNotifications,
  eventSubscriptions,
  realEventSearch,
  submitReport,
  moderateContent,
  shortsRecommendations,
  shortsTelemetry,
  applyReferralCode,
  manageSponsorships,
  logAuditEvent,
  invokeAdvancedAI,
  searchSchools,
  submitSchoolParticipationRequest,
} = legacyFunctions;

// --- Additional helpers used across the app ---

export async function getAdvancedAnalytics(params) {
  return { metrics: [], params };
}
