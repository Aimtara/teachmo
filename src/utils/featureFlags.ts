export function isFeatureEnabled(flag: string): boolean {
  const key = `VITE_${flag}`;
  const value = (import.meta as { env?: Record<string, unknown> })?.env?.[key];

  if (value === true) return true;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }

  return false;
}
