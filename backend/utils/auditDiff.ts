import _ from 'lodash';

type DiffSnapshot = Record<string, unknown>;

type DiffResult = {
  before: DiffSnapshot | null;
  after: DiffSnapshot | null;
} | null;

/**
 * Compares two objects and returns the difference.
 * Used for generating 'before' and 'after' snapshots for audit logs.
 */
export function calculateDiff(
  original: DiffSnapshot | null | undefined,
  updated: DiffSnapshot | null | undefined
): DiffResult {
  if (!original) return { before: null, after: updated ?? null };
  if (!updated) return { before: original, after: null };

  const before: DiffSnapshot = {};
  const after: DiffSnapshot = {};

  Object.keys(updated).forEach((key) => {
    if (!_.isEqual(original[key], updated[key])) {
      if (original[key] !== undefined) before[key] = original[key];
      after[key] = updated[key];
    }
  });

  Object.keys(original).forEach((key) => {
    if (updated[key] === undefined) {
      before[key] = original[key];
      after[key] = null;
    }
  });

  if (Object.keys(after).length === 0) return null;

  return { before, after };
}

export function redactPii(
  obj: DiffSnapshot | null | undefined,
  piiFields: string[] = ['password', 'token', 'secret', 'ssn', 'dob']
): DiffSnapshot | null | undefined {
  if (!obj) return obj;
  const clean: DiffSnapshot = { ...obj };
  piiFields.forEach((field) => {
    if (clean[field]) clean[field] = '[REDACTED]';
  });
  return clean;
}
