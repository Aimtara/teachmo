export interface BackendLogger {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  setLevel(level: string): void;
  getLevel(): string;
}

export function createLogger(namespace?: string): BackendLogger;
export const logger: BackendLogger;
