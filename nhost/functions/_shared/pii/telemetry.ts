export type SanitizerOptions = {
  maxDepth?: number;
  maxKeys?: number;
  maxArray?: number;
  maxString?: number;
  maxBytes?: number;
};

const DEFAULT_LIMITS = {
  maxDepth: 4,
  maxKeys: 60,
  maxArray: 30,
  maxString: 400,
  maxBytes: 8192,
};

const EVENT_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|set-cookie|session|api[_-]?key|bearer|refresh|access[_-]?token|id[_-]?token|ssn|social|message|body|content|prompt|transcript|stack|componentstack)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d()\s-]{6,}\d)/;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function sanitizeEventName(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  return EVENT_NAME_RE.test(trimmed) ? trimmed : '';
}

function byteLen(value: string) {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

function looksSensitiveValue(value: string) {
  const v = value.trim();
  if (!v) return false;
  return EMAIL_RE.test(v) || PHONE_RE.test(v) || LONG_TOKEN_RE.test(v);
}

function truncateString(value: string, max: number) {
  if (value.length <= max) return { value, truncated: false };
  return { value: value.slice(0, max) + '…', truncated: true };
}

function sanitizeAny(value: unknown, depth: number, limits: Required<SanitizerOptions>, flags: Flags) {
  if (depth > limits.maxDepth) {
    flags.truncated = true;
    return '[TRUNCATED]';
  }

  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    if (looksSensitiveValue(value)) {
      flags.redacted = true;
      return '[REDACTED]';
    }
    const t = truncateString(value, limits.maxString);
    if (t.truncated) flags.truncated = true;
    return t.value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const items = value.slice(0, limits.maxArray);
    if (value.length > limits.maxArray) flags.truncated = true;
    const out = items.map((item) => sanitizeAny(item, depth + 1, limits, flags));
    if (value.length > limits.maxArray) out.push('[TRUNCATED_ARRAY]');
    return out;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, limits.maxKeys);
    if (Object.keys(obj).length > limits.maxKeys) flags.truncated = true;

    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (SENSITIVE_KEY_RE.test(key)) {
        flags.redacted = true;
        out[key] = '[REDACTED]';
        continue;
      }

      const v = obj[key];
      if (typeof v === 'string' && looksSensitiveValue(v)) {
        flags.redacted = true;
        out[key] = '[REDACTED]';
        continue;
      }

      out[key] = sanitizeAny(v, depth + 1, limits, flags);
    }

    if (Object.keys(obj).length > limits.maxKeys) {
      out.__dropped_keys = Object.keys(obj).length - limits.maxKeys;
    }

    return out;
  }

  flags.truncated = true;
  return String(value);
}

type Flags = {
  truncated: boolean;
  redacted: boolean;
};

function boundJson(value: unknown, maxBytes: number, flags: Flags) {
  try {
    const json = JSON.stringify(value);
    if (byteLen(json) <= maxBytes) return value;
  } catch {
    // fall through
  }

  flags.truncated = true;
  return { __dropped: true };
}

export function sanitizeTelemetryMetadata(input: unknown, options: SanitizerOptions = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options } as Required<SanitizerOptions>;
  const flags: Flags = { truncated: false, redacted: false };
  const sanitized = sanitizeAny(input, 0, limits, flags);
  const bounded = boundJson(sanitized, limits.maxBytes, flags);
  return { value: bounded, ...flags };
}
