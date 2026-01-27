import * as Sentry from '@sentry/react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  scope?: string;
  extra?: Record<string, unknown>;
  error?: unknown;
};

const fallbackRequestId = () =>
  (globalThis.crypto?.randomUUID?.() || `req_${Math.random().toString(16).slice(2)}`);

export function withRequestContext(context: LogContext = {}) {
  return {
    requestId: context.requestId || fallbackRequestId(),
    userId: context.userId,
    scope: context.scope,
    extra: context.extra,
    error: context.error,
    timestamp: new Date().toISOString()
  };
}

function log(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = withRequestContext(context);
  const consoleMethod = level === 'debug' ? 'log' : level;
  const printable = { ...payload };
  if (payload.error instanceof Error) {
    printable.error = { name: payload.error.name, message: payload.error.message, stack: payload.error.stack };
  }

  console[consoleMethod]?.(`[${payload.requestId}] ${message}`, printable);

  if (Sentry.getCurrentHub()?.getClient()) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', payload.requestId);
      if (payload.scope) scope.setTag('scope', payload.scope);
      if (payload.userId) scope.setUser({ id: payload.userId });
      if (payload.extra) scope.setExtras(payload.extra);
      if (payload.error instanceof Error) scope.captureException(payload.error);
      else scope.captureMessage(message, level === 'warn' ? 'warning' : level);
    });
  }

  return payload;
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context)
};
