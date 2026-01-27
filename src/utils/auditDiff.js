export function buildChangeDetails(before, after) {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null;
  const changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (beforeValue !== afterValue) {
      changes[key] = { before: beforeValue ?? null, after: afterValue ?? null };
    }
  }
  return Object.keys(changes).length ? changes : null;
}
