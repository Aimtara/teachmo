import { describe, expect, it } from 'vitest';
import {
  assertNoProductionBypass,
  envFlag,
  envNumber,
  envString,
  getAppEnv,
  requireClientEnv,
} from '@/config/env';

describe('env helpers', () => {
  it('parses boolean strings deterministically', () => {
    expect(envFlag('true')).toBe(true);
    expect(envFlag('TRUE')).toBe(true);
    expect(envFlag('false')).toBe(false);
    expect(envFlag('')).toBe(false);
    expect(envFlag(undefined, { defaultValue: true })).toBe(true);
  });

  it('"false" never becomes truthy', () => {
    expect(Boolean('false')).toBe(true);
    expect(envFlag('false')).toBe(false);
  });

  it('throws on invalid strict flags', () => {
    expect(() => envFlag('yes', { strict: true, name: 'VITE_FLAG' })).toThrow(/Invalid boolean/);
  });

  it('parses strings and numbers with defaults', () => {
    expect(envString(' hello ')).toBe('hello');
    expect(envString('', { defaultValue: 'fallback' })).toBe('fallback');
    expect(envNumber('0.25', { defaultValue: 1 })).toBe(0.25);
    expect(envNumber('', { defaultValue: 3 })).toBe(3);
    expect(() => envNumber('abc', { name: 'RATE', strict: true })).toThrow(/Invalid number/);
  });

  it('requires client env values', () => {
    expect(requireClientEnv('VITE_NHOST_BACKEND_URL', { VITE_NHOST_BACKEND_URL: 'https://example.test' })).toBe(
      'https://example.test'
    );
    expect(() => requireClientEnv('VITE_NHOST_BACKEND_URL', {})).toThrow(/Missing required/);
  });

  it('normalizes app environments', () => {
    expect(getAppEnv({ VITE_APP_ENV: 'production' })).toBe('production');
    expect(getAppEnv({ VITE_APP_ENV: 'stage' })).toBe('staging');
    expect(getAppEnv({ MODE: 'development', DEV: true })).toBe('development');
    expect(getAppEnv({ MODE: 'test' })).toBe('test');
  });

  it('rejects production and staging auth bypass flags', () => {
    expect(() =>
      assertNoProductionBypass({
        VITE_APP_ENV: 'production',
        VITE_E2E_BYPASS_AUTH: 'true',
      })
    ).toThrow(/Unsafe auth bypass/);

    expect(() =>
      assertNoProductionBypass({
        VITE_APP_ENV: 'staging',
        VITE_BYPASS_AUTH: 'true',
      })
    ).toThrow(/Unsafe auth bypass/);
  });

  it('allows explicit test bypass flags in test/local environments', () => {
    expect(() =>
      assertNoProductionBypass({
        VITE_APP_ENV: 'test',
        VITE_E2E_BYPASS_AUTH: 'true',
      })
    ).not.toThrow();
  });
});
