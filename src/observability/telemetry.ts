import { nhost } from '@/lib/nhostClient';

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
};

/**
 * Fire-and-forget telemetry. We never want UX to break because analytics is down.
 */
export async function trackEvent(input: TelemetryEventInput): Promise<void> {
  try {
    const { error } = await nhost.functions.call('track-event', input);
    if (error) console.warn('track-event failed', error);
  } catch (e) {
    console.warn('track-event exception', e);
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
    userId: context.userId ?? undefined
  };

  await trackEvent({ ...input, metadata });
}

export function installTelemetryAutoFlush(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    // Placeholder for future flush hooks. Keeping to satisfy imports without blocking unload.
  });
}
