import { createClient } from '@base44/sdk';

export type Base44Client = ReturnType<typeof createClient>;

function resolveBase44AppId(): string {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, string | boolean | undefined> })?.env ?? {}
      : {};
  const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};

  const appId = metaEnv.VITE_BASE44_APP_ID ?? processEnv.VITE_BASE44_APP_ID;
  if (appId) return appId;

  const message =
    'Base44 app ID is not set. Define VITE_BASE44_APP_ID in your environment to enable Base44 client connectivity.';
  const isDev = Boolean(metaEnv.DEV ?? processEnv.NODE_ENV === 'development');

  if (isDev) {
    throw new Error(message);
  }

  console.warn(message);
  return '';
}

const BASE44_APP_ID = resolveBase44AppId();

export const base44: Base44Client = createClient({
  appId: BASE44_APP_ID,
  requiresAuth: true
});

export default base44;
