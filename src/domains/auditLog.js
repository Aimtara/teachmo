import { graphql } from '@/lib/graphql';
import { buildChangeDetails } from '@/utils/auditDiff';

/**
 * Append-only audit log.
 *
 * Launch hardening goal:
 * - Keep payload small and predictable
 * - Avoid accidental PII / token / stack storage
 */

const LIMITS = {
  maxDepth: 4,
  maxKeys: 60,
  maxArray: 30,
  maxString: 400,
  maxMetadataBytes: 4096,
  maxSnapshotBytes: 4096,
};

const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|set-cookie|session|api[_-]?key|bearer|refresh|access[_-]?token|id[_-]?token|ssn|social|stack|componentstack)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d()\s-]{6,}\d)/;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

function byteLen(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return String(str || '').length;
  }
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || ''));
}

function looksSensitiveValue(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  return EMAIL_RE.test(v) || PHONE_RE.test(v) || LONG_TOKEN_RE.test(v);
}

function truncateString(value, max) {
  const s = String(value ?? '');
  if (s.length <= max) return { value: s, truncated: false };
  return { value: s.slice(0, max) + '…', truncated: true };
}

function sanitizeAny(value, depth, flags) {
  if (depth > LIMITS.maxDepth) {
    flags.truncated = true;
    return '[TRUNCATED]';
  }

  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    if (looksSensitiveValue(value)) {
      flags.redacted = true;
      return '[REDACTED]';
    }
    const t = truncateString(value, LIMITS.maxString);
    if (t.truncated) flags.truncated = true;
    return t.value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const items = value.slice(0, LIMITS.maxArray);
    if (value.length > LIMITS.maxArray) flags.truncated = true;
    const out = items.map((v) => sanitizeAny(v, depth + 1, flags));
    if (value.length > LIMITS.maxArray) out.push('[TRUNCATED_ARRAY]');
    return out;
  }

  if (typeof value === 'object') {
    const obj = value;
    const keys = Object.keys(obj).slice(0, LIMITS.maxKeys);
    if (Object.keys(obj).length > LIMITS.maxKeys) flags.truncated = true;

    const out = {};
    for (const k of keys) {
      if (isSensitiveKey(k)) {
        flags.redacted = true;
        out[k] = '[REDACTED]';
        continue;
      }
      const v = obj[k];
      if (typeof v === 'string' && looksSensitiveValue(v)) {
        flags.redacted = true;
        out[k] = '[REDACTED]';
        continue;
      }
      out[k] = sanitizeAny(v, depth + 1, flags);
    }

    if (Object.keys(obj).length > LIMITS.maxKeys) {
      out.__dropped_keys = Object.keys(obj).length - LIMITS.maxKeys;
    }

    return out;
  }

  flags.truncated = true;
  return String(value);
}

function boundJson(value, maxBytes, flags) {
  try {
    const json = JSON.stringify(value);
    if (byteLen(json) <= maxBytes) return value;
  } catch {
    // fall through
  }

  // Last resort: drop payload.
  flags.truncated = true;
  return { __dropped: true };
}

function sanitizeAndBound(value, maxBytes) {
  const flags = { truncated: false, redacted: false };
  const sanitized = sanitizeAny(value, 0, flags);
  const bounded = boundJson(sanitized, maxBytes, flags);
  return { value: bounded, ...flags };
}
export async function writeAuditLog(input) {
  const mutation = `
    mutation InsertAuditLog($object: audit_log_insert_input!) {
      insert_audit_log_one(object: $object) {
        id
        created_at
      }
    }
  `;

  const changeDetails = input.changes ?? buildChangeDetails(input.before, input.after);
  const rawMetadata = {
    ...(input.metadata ?? {}),
    ...(changeDetails ? { change_details: changeDetails } : {}),
  };

  const meta = sanitizeAndBound(rawMetadata, LIMITS.maxMetadataBytes);
  const safeMeta =
    meta.value && typeof meta.value === 'object' && !Array.isArray(meta.value) ? meta.value : { value: meta.value };
  const before = input.before
    ? sanitizeAndBound(input.before, LIMITS.maxSnapshotBytes)
    : { value: null, truncated: false, redacted: false };
  const after = input.after
    ? sanitizeAndBound(input.after, LIMITS.maxSnapshotBytes)
    : { value: null, truncated: false, redacted: false };

  // Surface truncation/redaction in a low-noise way.
  const metadata = {
    ...safeMeta,
    ...(meta.truncated || before.truncated || after.truncated ? { meta_truncated: true } : {}),
    ...(meta.redacted || before.redacted || after.redacted ? { meta_redacted: true } : {}),
  };

  // actor_id is set server-side via Hasura insert permissions using X-Hasura-User-Id.
  // Do not send actor_id from the client to avoid permission mismatches.
  const object = {
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata,
    before_snapshot: before.value ?? null,
    after_snapshot: after.value ?? null,
    contains_pii: input.containsPii ?? null,
  };

  const data = await graphql(mutation, { object });
  return data?.insert_audit_log_one ?? null;
}

export async function listAuditLog({ entityType, entityId, limit = 80 } = {}) {
  const query = `query AuditLog($where: audit_log_bool_exp!, $limit: Int!) {
    audit_log(where: $where, order_by: { created_at: desc }, limit: $limit) {
      id
      created_at
      actor_id
      action
      entity_type
      entity_id
      metadata
    }
  }`;

  const where = {
    ...(entityType ? { entity_type: { _eq: entityType } } : {}),
    ...(entityId ? { entity_id: { _eq: entityId } } : {}),
  };

  return graphql(query, { where, limit });
}
