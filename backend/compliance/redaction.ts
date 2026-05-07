/* eslint-env node */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const STUDENT_ID_RE = /\b(?:student|child|sis|school)[_-]?id[:=#\s-]*[A-Za-z0-9-]{4,}\b/gi;
const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.' -]+\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct)\b/gi;
const WELLBEING_RE = /\b(disability|iep|504 plan|diagnos(?:is|ed)|therapy|mental health|self[- ]?harm|anxiety|depression|trauma|wellbeing|well-being)\b/gi;
const NAME_KEY_RE = /(^|_)(name|full_name|first_name|last_name|display_name|student_name|studentName|child_name|childName|guardian_name|guardianName)$/i;
const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|session|api[_-]?key|email|phone|address|prompt|response|output|free[_-]?text|concern|note|disability|health|wellbeing|student[_-]?id|school[_-]?id|sis[_-]?id)/i;

type RedactedValue = unknown;

interface RedactionOptions {
  maxDepth?: number;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type LoggerLike = Record<LogLevel, (..._args: unknown[]) => void> & Partial<Record<string, (..._args: unknown[]) => void>>;

interface SafeLogOptions {
  level?: LogLevel;
  logger?: LoggerLike;
}

interface SafeAnalyticsOptions {
  send?: (_event: { eventName: string; payload: RedactedValue; piiMinimized: true }) => void;
}

function redactString(value: unknown): string {
  return String(value)
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(PHONE_RE, '[redacted-phone]')
    .replace(ADDRESS_RE, '[redacted-address]')
    .replace(STUDENT_ID_RE, '[redacted-id]')
    .replace(WELLBEING_RE, '[redacted-sensitive]');
}

export function redactPII(input: unknown, { maxDepth = 6 }: RedactionOptions = {}): RedactedValue {
  const seen = new WeakSet<object>();

  function visit(value: unknown, depth = 0, key = ''): RedactedValue {
    if (value === null || value === undefined) return value;
    if (depth > maxDepth) return '[TRUNCATED]';
    if (typeof value === 'string') {
      if (NAME_KEY_RE.test(key) || SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
      return redactString(value);
    }
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map((entry) => visit(entry, depth + 1, key));

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => {
        if (NAME_KEY_RE.test(entryKey) || SENSITIVE_KEY_RE.test(entryKey)) {
          return [entryKey, '[REDACTED]'];
        }
        return [entryKey, visit(entryValue, depth + 1, entryKey)];
      }),
    );
  }

  return visit(input);
}

export function redactStudentPII(input: unknown): RedactedValue {
  return redactPII(input);
}

export function redactPrompt(input: unknown): RedactedValue {
  if (typeof input === 'string') return redactString(input).replace(/.+/s, '[redacted-prompt]');
  return redactPII(input);
}

export function safeLog(eventName: string, payload: unknown = {}, options: SafeLogOptions = {}): {
  eventName: string;
  payload: RedactedValue;
} {
  const level = options.level || 'info';
  const logger = options.logger || console;
  const safePayload = redactPII(payload);
  const sink = typeof logger[level] === 'function' ? logger[level].bind(logger) : logger.info.bind(logger);
  sink(eventName, safePayload);
  return { eventName, payload: safePayload };
}

export function safeAnalytics(eventName: string, payload: unknown = {}, options: SafeAnalyticsOptions = {}): {
  eventName: string;
  payload: RedactedValue;
  piiMinimized: true;
} {
  const event = {
    eventName,
    payload: redactPII(payload),
    piiMinimized: true as const,
  };
  if (typeof options.send === 'function') options.send(event);
  return event;
}
