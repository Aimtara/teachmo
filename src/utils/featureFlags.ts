import { isFeatureEnabled as resolveFeatureEnabled } from '@/config/features';

export function isFeatureEnabled(flag: string): boolean {
  return resolveFeatureEnabled(flag as Parameters<typeof resolveFeatureEnabled>[0]);
}
