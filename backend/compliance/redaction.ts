/* eslint-env node */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const STUDENT_ID_RE = /\b(?:student|child|sis|school)[_-]?id[:=#\s-]*[A-Za-z0-9-]{4,}\b/gi;
const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.' -]+\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct)\b/gi;
const WELLBEING_RE = /\b(disability|iep|504 plan|diagnos(?:is|ed)|therapy|mental health|self[- ]?harm|anxiety|depression|trauma|wellbeing|well-being)\b/gi;
const NAME_KEY_RE = /(^|_)(name|full_name|first_name|last_name|display_name|student_name|studentName|child_name|childName|guardian_name|guardianName)$/i;
const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|session|api[_-]?key|email|phone|address|prompt|response|output|free[_-]?text|concern|note|disability|health|wellbeing|student[_-]?id|school[_-]?id|sis[_-]?id)/i;

type JsonSafeValue = null | undefined | string | number | boolean | JsonSafeValue[] | { [key: string]: JsonSafeValue };

interface RedactionOptions {
  maxDepth?: number;
}

interface LogSink {
  error?: (..._args: unknown[]) => void;
  warn?: (..._args: unknown[]) => void;
  info?: (..._args: unknown[]) => void;
  debug?: (..._args: unknown[]) => void;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface SafeLogOptions {
  level?: LogLevel;
  logger?: LogSink;
}

interface AnalyticsEvent {
  eventName: string;
  payload: JsonSafeValue;
  piiMinimized: true;
}

interface AnalyticsOptions {
  send?: (_event: AnalyticsEvent) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactString(value: unknown): string {
  return String(value)
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(PHONE_RE, '[redacted-phone]')
    .replace(ADDRESS_RE, '[redacted-address]')
    .replace(STUDENT_ID_RE, '[redacted-id]')
    .replace(WELLBEING_RE, '[redacted-sensitive]');
}

export function redactPII(input: unknown, { maxDepth = 6 }: RedactionOptions = {}): JsonSafeValue {
  const seen = new WeakSet<object>();

  function visit(value: unknown, depth = 0, key = ''): JsonSafeValue {
    if (value === null || value === undefined) return value;
    if (depth > maxDepth) return '[TRUNCATED]';
    if (typeof value === 'string') {
      if (NAME_KEY_RE.test(key) || SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
      return redactString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map((entry) => visit(entry, depth + 1, key));
    if (!isRecord(value)) return '[Unsupported]';

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

export function redactStudentPII(input: unknown): JsonSafeValue {
  return redactPII(input);
}

export function redactPrompt(input: unknown): JsonSafeValue {
  if (typeof input === 'string') return redactString(input).replace(/.+/s, '[redacted-prompt]');
  return redactPII(input);
}

export function safeLog(eventName: string, payload: unknown = {}, options: SafeLogOptions = {}): { eventName: string; payload: JsonSafeValue } {
  const level = options.level || 'info';
  const logger = options.logger || console;
  const safePayload = redactPII(payload);
  const fallback = logger.info?.bind(logger) ?? console.info.bind(console);
  const sink = typeof logger[level] === 'function' ? logger[level].bind(logger) : fallback;
  sink(eventName, safePayload);
  return { eventName, payload: safePayload };
}

export function safeAnalytics(eventName: string, payload: unknown = {}, options: AnalyticsOptions = {}): AnalyticsEvent {
  const event = {
    eventName,
    payload: redactPII(payload),
    piiMinimized: true,
  } as const;
  if (typeof options.send === 'function') options.send(event);
  return event;
}
