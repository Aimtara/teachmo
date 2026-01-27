export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function readEnv(key: string): string | undefined {
  // Vite / ESM
  const metaEnv =
    typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;
  if (metaEnv && key in metaEnv) return metaEnv[key];

  // Node / tests
  if (typeof process !== 'undefined' && process?.env && key in process.env) return process.env[key];
  return undefined;
}

export function normalizeLogLevel(level?: string | null): LogLevel {
  const normalized = (level || '').trim().toLowerCase();
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
    return normalized;
  }
  return 'info';
}

export type Logger = {
  level: LogLevel;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

export function createLogger(level: LogLevel): Logger {
  const enabled = (target: LogLevel) => LEVEL_ORDER[target] <= LEVEL_ORDER[level];

  const emit = (target: LogLevel, message: string, context?: LogContext) => {
    if (!enabled(target)) return;

    const payload = context ? { ...context } : undefined;

    // Keep dev output friendly, but structured.
    const fn = target === 'error' ? console.error : target === 'warn' ? console.warn : console.info;
    fn(`[${target}] ${message}`, payload ?? '');
  };

  return {
    level,
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
  };
}

// Module-scope singleton (matches the “move logger creation to module scope” recommendation).
export const logger: Logger = createLogger(normalizeLogLevel(readEnv('VITE_LOG_LEVEL')));
