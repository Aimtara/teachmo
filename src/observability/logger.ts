import * as Sentry from '@sentry/react';
import { redactForLogging } from './redaction';

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
  const rawPayload = withRequestContext(context);
  const payload = redactForLogging(rawPayload) as ReturnType<typeof withRequestContext>;
  const consoleMethod = level === 'debug' ? 'log' : level;
  const printable = { ...payload };
  if (rawPayload.error instanceof Error) {
    printable.error = { name: rawPayload.error.name, message: rawPayload.error.message };
  }

  const safeMessage = String(redactForLogging(message));
  console[consoleMethod]?.(`[${payload.requestId}] ${safeMessage}`, printable);

  if (Sentry.getCurrentHub()?.getClient()) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', payload.requestId);
      if (payload.scope) scope.setTag('scope', payload.scope);
      if (payload.userId) scope.setUser({ id: payload.userId });
      if (payload.extra) scope.setExtras(redactForLogging(payload.extra) as Record<string, unknown>);
      if (rawPayload.error instanceof Error) scope.captureException(rawPayload.error);
      else scope.captureMessage(safeMessage, level === 'warn' ? 'warning' : level);
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
