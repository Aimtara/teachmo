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
  submitSchoolParticipationRequest,
  searchSchools,
  submitReport,
  moderateContent,
  shortsRecommendations,
  shortsTelemetry,
  logAuditEvent,
} = legacyFunctions;

// --- Additional helpers used across the app ---

export async function invokeAdvancedAI(payload) {
  // Reuse the existing AI suggestion pipeline when available.
  return legacyFunctions.aiActivitySuggestions(payload);
}

export async function applyReferralCode(code) {
  // Simulate a successful referral application.
  return { success: true, code };
}

export async function manageSponsorships(data) {
  // Placeholder sponsorship handler.
  return { status: 'queued', data };
}



export async function getAdvancedAnalytics(params) {
  return { metrics: [], params };
}
