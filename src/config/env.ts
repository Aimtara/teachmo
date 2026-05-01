type EnvValue = string | boolean | number | null | undefined;

export type AppEnv = 'local' | 'development' | 'test' | 'staging' | 'production' | 'unknown';

export type EnvReader = Record<string, EnvValue>;

type EnvOptions<T> = {
  defaultValue?: T;
  strict?: boolean;
  env?: EnvReader;
};

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off']);

const BYPASS_FLAG_NAMES = [
  'VITE_E2E_BYPASS_AUTH',
  'VITE_BYPASS_AUTH',
  'VITE_AUTH_BYPASS',
  'VITE_USE_MOCK_AUTH',
  'VITE_MOCK_AUTH',
  'VITE_ALLOW_MOCK_AUTH',
];

function runtimeEnv(): EnvReader {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta.env as EnvReader | undefined) : undefined;
  const processEnv =
    typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : undefined;
  return {
    ...(processEnv ?? {}),
    ...(viteEnv ?? {}),
  };
}

function resolveEnvValue(nameOrValue: string | EnvValue, env: EnvReader): EnvValue {
  if (typeof nameOrValue === 'string' && /^[A-Z][A-Z0-9_]*$/.test(nameOrValue)) {
    return env[nameOrValue];
  }
  return nameOrValue;
}

function shouldThrowForUnexpected(env: EnvReader, strict?: boolean): boolean {
  if (strict) return true;
  const appEnv = getAppEnv(env);
  return appEnv === 'production' || appEnv === 'staging';
}

export function getAppEnv(env: EnvReader = runtimeEnv()): AppEnv {
  const raw = String(env.VITE_APP_ENV ?? env.APP_ENV ?? env.MODE ?? env.NODE_ENV ?? '').trim().toLowerCase();

  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging' || raw === 'stage') return 'staging';
  if (raw === 'test' || raw === 'ci') return 'test';
  if (raw === 'development' || raw === 'dev') return 'development';
  if (raw === 'local') return 'local';
  if (!raw) return 'unknown';
  return 'unknown';
}

export function envString(
  nameOrValue: string | EnvValue,
  options: EnvOptions<string | undefined> = {}
): string | undefined {
  const env = options.env ?? runtimeEnv();
  const value = resolveEnvValue(nameOrValue, env);
  if (value === null || value === undefined) return options.defaultValue;
  const normalized = String(value).trim();
  return normalized === '' ? options.defaultValue : normalized;
}

export function envFlag(
  nameOrValue: string | EnvValue,
  options: EnvOptions<boolean> = {}
): boolean {
  const env = options.env ?? runtimeEnv();
  const value = resolveEnvValue(nameOrValue, env);
  if (value === null || value === undefined || value === '') return options.defaultValue ?? false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  const message = `Invalid boolean environment value "${value}" for ${String(nameOrValue)}. Use true/false.`;
  if (shouldThrowForUnexpected(env, options.strict)) {
    throw new Error(message);
  }

  console.warn(`[env] ${message}`);
  return options.defaultValue ?? false;
}

export function envNumber(
  nameOrValue: string | EnvValue,
  options: EnvOptions<number | undefined> = {}
): number | undefined {
  const env = options.env ?? runtimeEnv();
  const value = resolveEnvValue(nameOrValue, env);
  if (value === null || value === undefined || value === '') return options.defaultValue;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  const message = `Invalid numeric environment value "${value}" for ${String(nameOrValue)}.`;
  if (shouldThrowForUnexpected(env, options.strict)) {
    throw new Error(message);
  }

  console.warn(`[env] ${message}`);
  return options.defaultValue;
}

export function requireClientEnv(name: string, env: EnvReader = runtimeEnv()): string {
  const value = envString(name, { env });
  if (!value) throw new Error(`Missing required client environment variable: ${name}`);
  return value;
}

export function assertNoProductionBypass(env: EnvReader = runtimeEnv()): void {
  const appEnv = getAppEnv(env);
  if (appEnv !== 'production' && appEnv !== 'staging') return;

  const enabled = BYPASS_FLAG_NAMES.filter((name) => envFlag(name, { env, defaultValue: false, strict: true }));
  if (enabled.length > 0) {
    throw new Error(
      `Production/staging auth bypass flags are forbidden: ${enabled.join(', ')}. Disable bypass flags before deployment.`
    );
  }

  const authMode = envString('AUTH_MODE', { env })?.toLowerCase();
  if (authMode === 'mock') {
    throw new Error('AUTH_MODE=mock is forbidden for staging/production.');
  }
}

export function isE2EAuthBypassEnabled(env: EnvReader = runtimeEnv()): boolean {
  assertNoProductionBypass(env);
  return envFlag('VITE_E2E_BYPASS_AUTH', { env, defaultValue: false, strict: true });
}

export function isMaintenanceModeEnabled(env: EnvReader = runtimeEnv()): boolean {
  return envFlag('VITE_MAINTENANCE_MODE', { env, defaultValue: false, strict: true });
}

export function isNhostConfigured(env: EnvReader = runtimeEnv()): boolean {
  return Boolean(envString('VITE_NHOST_BACKEND_URL', { env }) || envString('VITE_NHOST_SUBDOMAIN', { env }));
}
