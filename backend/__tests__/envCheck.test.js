import { performStartupCheck } from '../utils/envCheck.js';

describe('performStartupCheck', () => {
  let originalEnv;
  let originalExit;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;

  beforeEach(() => {
    // Save original environment and process.exit
    originalEnv = { ...process.env };
    originalExit = process.exit;
    
    // Clear all environment variables for clean test isolation
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    
    // Mock process.exit
    process.exit = jest.fn();
    
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    
    // Clear and restore original environment
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    
    // Restore process.exit
    process.exit = originalExit;
  });

  test('passes when all required variables are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';

    performStartupCheck();

    expect(process.exit).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith('[env-check]', expect.stringContaining('Environment configuration check passed'));
  });

  test('accepts alternative admin secret variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.HASURA_ADMIN_SECRET = 'test-secret'; // Alternative to NHOST_ADMIN_SECRET
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';

    performStartupCheck();

    expect(process.exit).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith('[env-check]', expect.stringContaining('Environment configuration check passed'));
  });

  test('accepts alternative GraphQL URL variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_BACKEND_URL = 'http://localhost:8080'; // Alternative to NHOST_GRAPHQL_URL
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';

    performStartupCheck();

    expect(process.exit).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith('[env-check]', expect.stringContaining('Environment configuration check passed'));
  });

  test('exits in production when required admin secret is missing', () => {
    process.env.NODE_ENV = 'production';
    // Missing all admin secret variants
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';

    performStartupCheck();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('FATAL: Missing required environment variables'),
      expect.arrayContaining([expect.stringContaining('NHOST_ADMIN_SECRET')])
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits in production when required GraphQL URL is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    // Missing all GraphQL URL variants
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';

    performStartupCheck();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('FATAL: Missing required environment variables'),
      expect.arrayContaining([expect.stringContaining('NHOST_GRAPHQL_URL')])
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits in production when AUTH_JWKS_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    // Missing AUTH_JWKS_URL

    performStartupCheck();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('FATAL: Missing required environment variables'),
      expect.arrayContaining(['AUTH_JWKS_URL'])
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('logs error but does not exit in non-production when required variables are missing', () => {
    process.env.NODE_ENV = 'development';
    // Missing required variables

    performStartupCheck();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('FATAL: Missing required environment variables'),
      expect.any(Array)
    );
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('warns about missing integration keys in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';
    // Missing integration keys (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENAI_API_KEY)

    performStartupCheck();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('WARNING: Missing integration keys in production'),
      expect.arrayContaining(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'])
    );
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('logs info about missing integration keys in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';
    // Missing integration keys

    performStartupCheck();

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[env-check]',
      expect.stringContaining('Missing integration keys (acceptable for local dev)'),
      expect.arrayContaining(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'])
    );
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('does not warn about integration keys when they are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'test-secret';
    process.env.NHOST_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.AUTH_JWKS_URL = 'http://localhost:8080/.well-known/jwks.json';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.OPENAI_API_KEY = 'test-api-key';

    performStartupCheck();

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith('[env-check]', expect.stringContaining('Environment configuration check passed'));
    expect(process.exit).not.toHaveBeenCalled();
  });
});
