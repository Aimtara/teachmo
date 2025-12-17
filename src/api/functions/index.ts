// Client-side helpers for calling backend functions.
// These wrappers either proxy to the legacy `src/api/legacy/functions.ts` module
// or provide lightweight fallbacks used throughout the UI.
import * as legacyFunctions from '../legacy/functions';

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
} = legacyFunctions;

// --- Additional helpers used across the app ---

export type GenericPayload = Record<string, unknown>;

export async function invokeAdvancedAI(payload: GenericPayload = {}): Promise<unknown> {
  // Reuse the existing AI suggestion pipeline when available.
  return legacyFunctions.aiActivitySuggestions(payload);
}

export async function applyReferralCode(code: string): Promise<{ success: boolean; code: string }> {
  // Simulate a successful referral application.
  return { success: true, code };
}

export async function manageSponsorships<T = GenericPayload>(data: T): Promise<{ status: string; data: T }> {
  // Placeholder sponsorship handler.
  return { status: 'queued', data };
}

export async function submitSchoolParticipationRequest<T = GenericPayload>(request: T): Promise<{ status: string; request: T }> {
  return { status: 'received', request };
}

export async function searchSchools(query: string): Promise<{ results: unknown[]; query: string }> {
  return { results: [], query };
}

export async function submitReport<T = GenericPayload>(report: T): Promise<{ status: string; report: T }> {
  return { status: 'submitted', report };
}

export async function moderateContent<T = GenericPayload>(payload: T): Promise<{ data: { action: string; reason: string }; payload: T }> {
  // Basic moderation stub that allows all content by default.
  return { data: { action: 'allow', reason: 'stub' }, payload };
}

export async function shortsRecommendations<T = GenericPayload>(context: T): Promise<{ items: unknown[]; context: T }> {
  return { items: [], context };
}

export async function shortsTelemetry<T = GenericPayload>(event: T): Promise<{ accepted: boolean; event: T }> {
  return { accepted: true, event };
}

export async function logAuditEvent<T = GenericPayload>(event: T): Promise<{ recorded: boolean }> {
  console.info('audit event', event);
  return { recorded: true };
}

export async function getAdvancedAnalytics<TParams = GenericPayload>(params: TParams): Promise<{ metrics: unknown[]; params: TParams }> {
  return { metrics: [], params };
}
