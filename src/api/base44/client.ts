import { createClient } from '@base44/sdk';

export type Base44Client = ReturnType<typeof createClient>;

function resolveBase44AppId(): string {
  const metaAppId = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> })?.env?.VITE_BASE44_APP_ID : undefined;
  if (metaAppId) return metaAppId;

  if (typeof process !== 'undefined' && process.env?.VITE_BASE44_APP_ID) {
    return process.env.VITE_BASE44_APP_ID;
  }

  console.warn(
    'Base44 app ID is not set. Define VITE_BASE44_APP_ID in your environment to enable Base44 client connectivity.'
  );
  return '';
}

const BASE44_APP_ID = resolveBase44AppId();

export const base44: Base44Client = createClient({
  appId: BASE44_APP_ID,
  requiresAuth: true
});

export default base44;
