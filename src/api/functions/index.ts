// Client-side helpers for calling backend functions.
//
// These wrappers proxy to the Nhost/Base44 function invokers.
// IMPORTANT: Do not add placeholder stubs here—stubs make the UI look "working"
// while silently dropping real behaviour.
import * as base44Functions from '../base44/functions';
import { orchestrate, orchestrateAction } from './orchestrate';
import { writeAuditLog } from '@/domains/auditLog';
import { logger } from '@/lib/logger';

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
  invokeAdvancedAI,
  applyReferralCode,
  manageSponsorships,
  getUXAnalytics,
  weeklyBriefSummarize,
  weeklyBriefGenerate,
} = base44Functions;

export { orchestrate, orchestrateAction };

// --- Additional helpers used across the app ---

export type GenericPayload = Record<string, unknown>;

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
  ...base44Functions,
  getAdvancedAnalytics,
  logAuditEvent,
  orchestrate,
  orchestrateAction
};

export default functionsMap;
