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
// More restrictive phone pattern to reduce false positives while still catching common phone formats
const PHONE_RE = /\b(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ENTRIES = 60;
const MAX_METADATA_STRING_LENGTH = 400;

function sanitizeTelemetryValue(value: unknown, depth: number): unknown {
  // Primitive handling
  if (typeof value === 'string') {
    if (EMAIL_RE.test(value) || PHONE_RE.test(value) || LONG_TOKEN_RE.test(value)) {
      return '[REDACTED]';
    }
    return value.length > MAX_METADATA_STRING_LENGTH
      ? value.slice(0, MAX_METADATA_STRING_LENGTH) + '…'
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    // Functions, symbols, etc. are not serializable; truncate them.
    return '[TRUNCATED]';
  }

  if (depth <= 0) {
    return '[TRUNCATED]';
  }

  // Array handling
  if (Array.isArray(value)) {
    return value.slice(0, MAX_METADATA_ENTRIES).map((item) => sanitizeTelemetryValue(item, depth - 1));
  }

  // Object handling
  const out: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_METADATA_ENTRIES);

  for (const [k, v] of entries) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[REDACTED]';
      continue;
    }

    out[k] = sanitizeTelemetryValue(v, depth - 1);
  }

  return out;
}

function sanitizeTelemetryClientMetadata(input?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const sanitized = sanitizeTelemetryValue(input, MAX_METADATA_DEPTH);

  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }

  return undefined;
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
