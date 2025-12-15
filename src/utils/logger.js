const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }

  return {
    MODE: process.env.NODE_ENV,
    VITE_LOG_LEVEL: process.env.VITE_LOG_LEVEL,
  };
};

const normalizeLevel = (level) => {
  const normalized = typeof level === 'string' ? level.toLowerCase() : '';
  return LOG_LEVELS.includes(normalized) ? normalized : 'info';
};

const env = getEnv();
const isProduction = env.MODE === 'production' || env.PROD === true;
let currentLevel = normalizeLevel(env.VITE_LOG_LEVEL || (isProduction ? 'warn' : 'debug'));

const shouldLog = (level) => {
  if (isProduction && level === 'debug') return false;

  const targetIndex = LOG_LEVELS.indexOf(level);
  const currentIndex = LOG_LEVELS.indexOf(currentLevel);
  return targetIndex <= currentIndex;
};

const createLogger = (namespace = 'app') => {
  const prefix = `[${namespace}]`;

  const logWithLevel = (level, method) => (...args) => {
    if (!shouldLog(level)) return;
    // eslint-disable-next-line no-console
    console[method](prefix, ...args);
  };

  return {
    error: logWithLevel('error', 'error'),
    warn: logWithLevel('warn', 'warn'),
    info: logWithLevel('info', 'info'),
    debug: logWithLevel('debug', 'debug'),
    setLevel: (level) => { currentLevel = normalizeLevel(level); },
    getLevel: () => currentLevel,
  };
};

const logger = createLogger('app');

export { createLogger, logger };
export default logger;
