const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

type LogLevel = (typeof LOG_LEVELS)[number];

type LoggerMethod = (...args: unknown[]) => void;

type Logger = {
  error: LoggerMethod;
  warn: LoggerMethod;
  info: LoggerMethod;
  debug: LoggerMethod;
  setLevel: (level: unknown) => void;
  getLevel: () => LogLevel;
};

const normalizeLevel = (level: unknown): LogLevel => {
  const normalized = typeof level === 'string' ? level.toLowerCase() : '';
  return (LOG_LEVELS as readonly string[]).includes(normalized) ? (normalized as LogLevel) : 'info';
};

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
let currentLevel: LogLevel = normalizeLevel(process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'));

const shouldLog = (level: LogLevel): boolean => {
  if (isProduction && level === 'debug') return false;
  return LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(currentLevel);
};

export const createLogger = (namespace = 'backend'): Logger => {
  const prefix = `[${namespace}]`;

  const logWithLevel = (level: LogLevel, method: 'error' | 'warn' | 'info' | 'debug') => (...args: unknown[]) => {
    if (!shouldLog(level)) return;
    console[method](prefix, ...args);
  };

  return {
    error: logWithLevel('error', 'error'),
    warn: logWithLevel('warn', 'warn'),
    info: logWithLevel('info', 'info'),
    debug: logWithLevel('debug', 'debug'),
    setLevel: (level: unknown) => {
      currentLevel = normalizeLevel(level);
    },
    getLevel: () => currentLevel
  };
};

export const logger = createLogger('backend');
