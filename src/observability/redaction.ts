const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|set-cookie|session|api[_-]?key|bearer|refresh|access[_-]?token|id[_-]?token|ssn|social|message|body|content|prompt|transcript|childname|studentname|email|phone|address)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\b(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

const MAX_DEPTH = 4;
const MAX_ENTRIES = 60;
const MAX_STRING = 400;

export const REDACTED = '[REDACTED]';
export const TRUNCATED = '[TRUNCATED]';

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

export function looksSensitiveValue(value: string): boolean {
  return EMAIL_RE.test(value) || PHONE_RE.test(value) || LONG_TOKEN_RE.test(value);
}

export function redactValue(value: unknown, depth = MAX_DEPTH): unknown {
  if (typeof value === 'string') {
    if (looksSensitiveValue(value)) return REDACTED;
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (value === undefined) return undefined;
  if (typeof value !== 'object') return TRUNCATED;
  if (depth <= 0) return TRUNCATED;

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ENTRIES).map((item) => redactValue(item, depth - 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, MAX_ENTRIES)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactValue(nestedValue, depth - 1);
  }
  return out;
}

export function redactRecord<T extends Record<string, unknown>>(input?: T | null): Record<string, unknown> {
  if (!input) return {};
  const redacted = redactValue(input);
  return redacted && typeof redacted === 'object' && !Array.isArray(redacted)
    ? (redacted as Record<string, unknown>)
    : {};
}
