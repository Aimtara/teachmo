import * as Sentry from '@sentry/react';
import { APP_ENV, BUILD_SHA } from '@/generated/buildMeta';

const dsn = import.meta.env.VITE_SENTRY_DSN;

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
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? 0.05),
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || APP_ENV || 'development'
  });
} else if (import.meta.env.DEV) {
  console.info('[observability] Sentry DSN not configured; skipping init.');
}
