import { nhost } from '@/lib/nhostClient';
import { createLogger } from '@/utils/logger';

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
};

const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|set-cookie|session|api[_-]?key|bearer|refresh|access[_-]?token|id[_-]?token|ssn|social|message|body|content|prompt|transcript|stack|componentstack)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d()\s-]{6,}\d)/;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

function sanitizeTelemetryClientMetadata(input?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  const entries = Object.entries(input).slice(0, 60);

  for (const [k, v] of entries) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (typeof v === 'string') {
      if (EMAIL_RE.test(v) || PHONE_RE.test(v) || LONG_TOKEN_RE.test(v)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = v.length > 400 ? v.slice(0, 400) + '…' : v;
      }
      continue;
    }
    // Keep primitives only; nested objects can hide PII and get huge.
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      out[k] = v;
    } else {
      out[k] = '[TRUNCATED]';
    }
  }

  return out;
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
  };

  await trackEvent({ ...input, metadata });
}

export function installTelemetryAutoFlush(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    // Placeholder for future flush hooks. Keeping to satisfy imports without blocking unload.
  });
}
