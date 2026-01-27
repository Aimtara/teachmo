import logger from './logger';

/**
 * Installs a global interception of console errors and warnings. When a
 * console.error or console.warn call is made anywhere in the application,
 * the original console method is invoked first to preserve native behaviour.
 * Then the message is forwarded to the app logger. To avoid infinite
 * recursion (because the logger itself uses console methods internally), the
 * override temporarily restores the original console method while calling
 * the logger.
 */
export function installConsoleLogger(): void {
  // Capture the original console methods so we can call them and restore.
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  // Override console.error.
  console.error = (...args: unknown[]): void => {
    // Invoke the original console.error to preserve default behaviour.
    origError(...args);
    // Temporarily restore console.error so logger doesn't recurse.
    const saved = console.error;
    (console as any).error = origError;
    try {
      logger.error(...args);
    } finally {
      // Restore our override.
      (console as any).error = saved;
    }
  };

  // Override console.warn.
  console.warn = (...args: unknown[]): void => {
    origWarn(...args);
    const saved = console.warn;
    (console as any).warn = origWarn;
    try {
      logger.warn(...args);
    } finally {
      (console as any).warn = saved;
    }
  };
}
