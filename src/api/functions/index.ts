// Client-side helpers for calling backend functions.
//
// These wrappers proxy to the Nhost/Base44 function invokers.
// IMPORTANT: Do not add placeholder stubs here—stubs make the UI look "working"
// while silently dropping real behaviour.
import * as base44Functions from '../base44/functions';
import { orchestrate } from './orchestrate';

// Re-export existing functions from the Base44 module to preserve behaviour.
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
  // Additional function invokers
  submitSchoolParticipationRequest,
  searchSchools,
  moderateContent,
  submitReport,
  shortsRecommendations,
  shortsTelemetry,
  logAuditEvent,
  invokeAdvancedAI,
  applyReferralCode,
  manageSponsorships,
  getUXAnalytics,
  weeklyBriefSummarize,
  weeklyBriefGenerate,
} = base44Functions;

export { orchestrate };

// --- Additional helpers used across the app ---

export type GenericPayload = Record<string, unknown>;

// Backwards compatible alias used in some screens.
export async function getAdvancedAnalytics<TParams = GenericPayload>(params: TParams): Promise<unknown> {
  return getUXAnalytics(params as GenericPayload);
}

const functionsMap = {
  ...base44Functions,
  getAdvancedAnalytics,
  orchestrate
};

export default functionsMap;
