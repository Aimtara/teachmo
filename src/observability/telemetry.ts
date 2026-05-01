import { nhost } from '@/lib/nhostClient';
import { createLogger } from '@/utils/logger';
import { redactForObservability } from './redaction';

const logger = createLogger('telemetry');

export type TelemetryEventInput = {
  eventName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type TelemetryContext = {
  organizationId?: string | null;
  schoolId?: string | null;
  userId?: string | null;
  role?: string | null;
  surface?: string | null;
};

function sanitizeTelemetryClientMetadata(input?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const sanitized = redactForObservability(input);

  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }

  return undefined;
}

function hasRequiredAnalyticsShape(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return false;
  return Boolean(metadata.organizationId && metadata.surface && metadata.role);
}

/**
 * Fire-and-forget telemetry. We never want UX to break because analytics is down.
 */
export async function trackEvent(input: TelemetryEventInput): Promise<void> {
  try {
    const safeInput: TelemetryEventInput = {
      ...input,
      metadata: sanitizeTelemetryClientMetadata(input.metadata),
    };

    if (!hasRequiredAnalyticsShape(safeInput.metadata)) {
      logger.warn('track-event skipped: missing required analytics fields', {
        eventName: input.eventName,
      });
      return;
    }

    const { error } = await nhost.functions.call('track-event', safeInput);
    if (error) logger.warn('track-event failed', error);
  } catch (e) {
    logger.warn('track-event exception', e);
  }
}

export async function logAnalyticsEvent(
  context: TelemetryContext,
  input: TelemetryEventInput
): Promise<void> {
  const metadata = {
    ...input.metadata,
    organizationId: context.organizationId ?? undefined,
    schoolId: context.schoolId ?? undefined,
    userId: context.userId ?? undefined,
    role: context.role ?? 'unknown',
    surface: context.surface ?? 'web',
  };

  await trackEvent({ ...input, metadata });
}

export function installTelemetryAutoFlush(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    // Placeholder for future flush hooks. Keeping to satisfy imports without blocking unload.
  });
}
