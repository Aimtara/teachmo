/* eslint-env node */
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

const normalizeLevel = (level) => {
  const normalized = typeof level === 'string' ? level.toLowerCase() : '';
  return LOG_LEVELS.includes(normalized) ? normalized : 'info';
};

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
let currentLevel = normalizeLevel(process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'));

const shouldLog = (level) => {
  if (isProduction && level === 'debug') return false;
  return LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(currentLevel);
};

export const createLogger = (namespace = 'backend') => {
  const prefix = `[${namespace}]`;

  const logWithLevel = (level, method) => (...args) => {
    if (!shouldLog(level)) return;
    console[method](prefix, ...args);
  };

  return {
    error: logWithLevel('error', 'error'),
    warn: logWithLevel('warn', 'warn'),
    info: logWithLevel('info', 'info'),
    debug: logWithLevel('debug', 'debug'),
    setLevel: (level) => {
      currentLevel = normalizeLevel(level);
    },
    getLevel: () => currentLevel
  };
};

export const logger = createLogger('backend');
