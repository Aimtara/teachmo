export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

type EnvShape = {
  MODE?: string;
  PROD?: boolean;
  VITE_LOG_LEVEL?: string;
};

const getEnv = (): EnvShape => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env as EnvShape;
  }

  if (typeof process !== 'undefined') {
    return {
      MODE: process.env.NODE_ENV,
      VITE_LOG_LEVEL: process.env.VITE_LOG_LEVEL
    };
  }

  return {};
};

const normalizeLevel = (level?: string | null): LogLevel => {
  const normalized = typeof level === 'string' ? level.toLowerCase() : '';
  return LOG_LEVELS.includes(normalized as LogLevel) ? (normalized as LogLevel) : 'info';
};

const env = getEnv();
const isProduction = env.MODE === 'production' || env.PROD === true;
let currentLevel: LogLevel = normalizeLevel(env.VITE_LOG_LEVEL || (isProduction ? 'warn' : 'debug'));

const shouldLog = (level: LogLevel): boolean => {
  if (isProduction && level === 'debug') return false;

  const targetIndex = LOG_LEVELS.indexOf(level);
  const currentIndex = LOG_LEVELS.indexOf(currentLevel);
  return targetIndex <= currentIndex;
};

export type Logger = {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  setLevel: (level: LogLevel | string) => void;
  getLevel: () => LogLevel;
};

export const createLogger = (namespace = 'app'): Logger => {
  const prefix = `[${namespace}]`;

  const logWithLevel = (level: LogLevel, method: 'error' | 'warn' | 'info' | 'debug') =>
    (...args: unknown[]) => {
      if (!shouldLog(level)) return;
      console[method](prefix, ...args);
    };

  return {
    error: logWithLevel('error', 'error'),
    warn: logWithLevel('warn', 'warn'),
    info: logWithLevel('info', 'info'),
    debug: logWithLevel('debug', 'debug'),
    setLevel: (level: LogLevel | string) => {
      currentLevel = normalizeLevel(level);
    },
    getLevel: () => currentLevel
  };
};

export const logger = createLogger('app');

export default logger;
