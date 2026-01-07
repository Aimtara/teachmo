type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_LEVEL: LogLevel = 'info';

const resolveLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return DEFAULT_LEVEL;
};

const activeLevel = resolveLogLevel();

const shouldLog = (level: LogLevel) => LOG_LEVELS[level] >= LOG_LEVELS[activeLevel];

const formatMessage = (namespace: string, message: string) => `[${namespace}] ${message}`;

export const createLogger = (namespace: string) => ({
  debug: (message: string, meta?: unknown) => {
    if (!shouldLog('debug')) return;
    console.debug(formatMessage(namespace, message), meta ?? '');
  },
  info: (message: string, meta?: unknown) => {
    if (!shouldLog('info')) return;
    console.info(formatMessage(namespace, message), meta ?? '');
  },
  warn: (message: string, meta?: unknown) => {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage(namespace, message), meta ?? '');
  },
  error: (message: string, meta?: unknown) => {
    if (!shouldLog('error')) return;
    console.error(formatMessage(namespace, message), meta ?? '');
  },
});
