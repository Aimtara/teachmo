/* eslint-env node */

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]));
  }
  return false;
}

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
    if (!deepEqual(original[key], updated[key])) {
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
