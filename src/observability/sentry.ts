import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
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
    environment: import.meta.env.MODE || import.meta.env.VITE_APP_ENV || 'development'
  });
} else if (import.meta.env.DEV) {
  console.info('[observability] Sentry DSN not configured; skipping init.');
}
