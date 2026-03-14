// Client-side helpers for calling backend functions.
//
// These wrappers proxy to the platform function invokers (Nhost-backed compatibility layer).
// IMPORTANT: Do not add placeholder stubs here—stubs make the UI look "working"
// while silently dropping real behaviour.
import * as platformFunctions from '../platform/functions';
import { orchestrate, orchestrateAction } from './orchestrate';
import { writeAuditLog } from '@/domains/auditLog';
import { logger } from '@/lib/logger';

// Re-export existing compatibility functions to preserve behaviour while migration completes.
export const {
  googleClassroomSync: rawGoogleClassroomSync,
  googleAuth: rawGoogleAuth,
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
  submitSchoolParticipationRequest: rawSubmitSchoolParticipationRequest,
  searchSchools: rawSearchSchools,
  moderateContent,
  submitReport,
  shortsRecommendations,
  shortsTelemetry,
  invokeAdvancedAI,
  applyReferralCode,
  manageSponsorships,
  getUXAnalytics,
  weeklyBriefSummarize,
  weeklyBriefGenerate,
} = platformFunctions;

export { orchestrate, orchestrateAction };

// --- Additional helpers used across the app ---

export type GenericPayload = Record<string, unknown>;


export type FunctionEnvelope<T> = { data?: T; error?: string };


export type GoogleAuthData = { authUrl?: string; success?: boolean; error?: string };
export async function googleAuth(params: GenericPayload): Promise<FunctionEnvelope<GoogleAuthData>> {
  const response = await rawGoogleAuth(params);
  return (response && typeof response === 'object') ? (response as FunctionEnvelope<GoogleAuthData>) : {};
}

export type GoogleSyncData = { success?: boolean; totalSynced?: number; error?: string };
export async function googleClassroomSync(params: GenericPayload): Promise<FunctionEnvelope<GoogleSyncData>> {
  const response = await rawGoogleClassroomSync(params);
  return (response && typeof response === 'object') ? (response as FunctionEnvelope<GoogleSyncData>) : {};
}

export type SearchSchoolRecord = {
  id?: string;
  name?: string;
  district?: string;
  state?: string;
  domain?: string;
  type?: string;
  status?: 'active' | 'pending' | 'beta';
  school_id?: string;
  school_name?: string;
  district_name?: string;
  school_domain?: string;
  school_type?: string;
};

export type SearchSchoolsData = { success?: boolean; schools?: SearchSchoolRecord[]; error?: string };
export async function searchSchools(params: GenericPayload): Promise<FunctionEnvelope<SearchSchoolsData>> {
  const response = await rawSearchSchools(params);
  return (response && typeof response === 'object') ? (response as FunctionEnvelope<SearchSchoolsData>) : {};
}

export type SchoolRequestData = { success?: boolean; error?: string; request?: unknown };
export async function submitSchoolParticipationRequest(
  params: GenericPayload
): Promise<FunctionEnvelope<SchoolRequestData>> {
  const response = await rawSubmitSchoolParticipationRequest(params);
  return (response && typeof response === 'object') ? (response as FunctionEnvelope<SchoolRequestData>) : {};
}

// Backwards compatible alias used in some screens.
export async function getAdvancedAnalytics<TParams = GenericPayload>(params: TParams): Promise<unknown> {
  return getUXAnalytics(params as GenericPayload);
}

type AuditSeverity = 'low' | 'medium' | 'high';

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

/**
 * Write an audit event to Hasura.
 *
 * This intentionally supports flexible shapes because it is called from disparate UI surfaces
 * (e.g., error boundaries, admin actions, moderation tools).
 */
export async function logAuditEvent<T = GenericPayload>(
  event: T
): Promise<{ recorded: boolean; id?: string }> {
  try {
    const payload = event as GenericPayload;
    const action = String(payload.action ?? 'unknown');
    const entityType = String(payload.resource_type ?? payload.entity_type ?? 'unknown');

    const rawEntityId = payload.resource_id ?? payload.entity_id;
    const entityId = isUuid(rawEntityId) ? rawEntityId : null;

    const severity = (payload.severity as AuditSeverity | undefined) ?? 'medium';

    const metadata: Record<string, unknown> = {
      ...(typeof payload.details === 'object' && payload.details ? (payload.details as Record<string, unknown>) : {}),
      ...(payload.metadata && typeof payload.metadata === 'object' ? (payload.metadata as Record<string, unknown>) : {}),
      severity,
    };

    if (rawEntityId && !entityId) {
      metadata.resource_id = rawEntityId;
    }

    const row = await writeAuditLog({
      action,
      entityType,
      entityId,
      metadata,
      before: payload.before as Record<string, unknown> | undefined,
      after: payload.after as Record<string, unknown> | undefined,
      changes: payload.changes as Record<string, unknown> | undefined,
      containsPii: payload.contains_pii as boolean | undefined,
    });

    return { recorded: Boolean(row?.id), id: row?.id };
  } catch (error) {
    logger.warn('logAuditEvent failed', { error });
    return { recorded: false };
  }
}

const functionsMap = {
  ...platformFunctions,
  googleAuth,
  googleClassroomSync,
  searchSchools,
  submitSchoolParticipationRequest,
  getAdvancedAnalytics,
  logAuditEvent,
  orchestrate,
  orchestrateAction
};

export default functionsMap;
