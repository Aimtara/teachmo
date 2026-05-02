import { BUILD_SHA } from '@/generated/buildMeta';
import { redactRecord } from '@/observability/redaction';

export const OBSERVABILITY_EVENT_NAMES = [
  'onboarding.complete',
  'message.sent',
  'activity.saved',
  'school_request.submitted',
  'permission.denied',
  'role.changed',
  'moderation.action',
] as const;

export type ObservabilityEventName = (typeof OBSERVABILITY_EVENT_NAMES)[number];

export type ObservabilityEvent = {
  eventName: ObservabilityEventName;
  actorId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  schoolId?: string | null;
  classroomId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  timestamp: string;
  release: string;
  metadata?: Record<string, unknown>;
};

export function createObservabilityEvent(
  input: Omit<ObservabilityEvent, 'timestamp' | 'release' | 'metadata'> & {
    metadata?: Record<string, unknown>;
    timestamp?: string;
    release?: string;
  }
): ObservabilityEvent {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
    release: input.release ?? BUILD_SHA,
    metadata: input.metadata ? redactRecord(input.metadata) : undefined,
  };
}

export function eventHasForbiddenSensitivePayload(event: ObservabilityEvent): boolean {
  const json = JSON.stringify(event);
  return /password|secret|token|jwt|authorization|cookie|messageBody|childName|studentName|rawPrompt/i.test(json);
}
