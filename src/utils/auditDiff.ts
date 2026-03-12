export type ChangeEntry = {
  before: unknown;
  after: unknown;
};

export type ChangeDetails = Record<string, ChangeEntry>;

export function buildChangeDetails(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): ChangeDetails | null {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null;

  const changes: ChangeDetails = {};
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
