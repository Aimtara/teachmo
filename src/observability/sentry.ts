import * as Sentry from '@sentry/react';
import { envNumber, envString } from '@/config/env';
import { APP_ENV, BUILD_SHA } from '@/generated/buildMeta';

const dsn = envString(import.meta.env.VITE_SENTRY_DSN);

if (dsn) {
  Sentry.init({
    dsn,
    release: BUILD_SHA,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true
      })
    ],
    tracesSampleRate: envNumber(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, {
      defaultValue: 0.1,
      name: 'VITE_SENTRY_TRACES_SAMPLE_RATE',
    }),
    replaysSessionSampleRate: envNumber(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE, {
      defaultValue: 0.05,
      name: 'VITE_SENTRY_REPLAY_SAMPLE_RATE',
    }),
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || APP_ENV || 'development'
  });
} else if (import.meta.env.DEV) {
  console.info('[observability] Sentry DSN not configured; skipping init.');
}
