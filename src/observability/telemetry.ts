import { nhost } from '@/lib/nhostClient';

export type TelemetryEventInput = {
  eventName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
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
