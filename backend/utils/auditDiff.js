/* eslint-env node */
import _ from 'lodash';

/**
 * Compares two objects and returns the difference.
 * Used for generating 'before' and 'after' snapshots for audit logs.
 */
export function calculateDiff(original, updated) {
  if (!original) return { before: null, after: updated };
  if (!updated) return { before: original, after: null };

  const before = {};
  const after = {};

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

export function redactPii(obj, piiFields = ['password', 'token', 'secret', 'ssn', 'dob']) {
  if (!obj) return obj;
  const clean = { ...obj };
  piiFields.forEach((field) => {
    if (clean[field]) clean[field] = '[REDACTED]';
  });
  return clean;
}
