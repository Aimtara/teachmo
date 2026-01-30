var mockLogger; // Use var for hoisting

jest.mock('../utils/logger.js', () => ({
  createLogger: jest.fn(() => {
    if (!mockLogger) {
      mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };
    }
    return mockLogger;
  }),
}));

/* eslint-env jest */

// Create mock functions that will be accessible in tests
let mockError, mockWarn, mockInfo, mockDebug;

// Mock the logger module before importing anything else
jest.mock('../utils/logger.js', () => ({
  createLogger: jest.fn(() => {
    // These are assigned in beforeEach
    return {
      get error() { return mockError; },
      get warn() { return mockWarn; },
      get info() { return mockInfo; },
      get debug() { return mockDebug; },
    };
  }),
}));

// Now import the module under test
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
  let mockExit;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset logger mocks if initialized
    if (mockLogger) {
      mockLogger.error.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.info.mockClear();
    }
    // Store original environment
    originalEnv = { ...process.env };

    // Create fresh mock functions for this test
    mockError = jest.fn();
    mockWarn = jest.fn();
    mockInfo = jest.fn();
    mockDebug = jest.fn();

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  describe('Required variables validation', () => {
    test('should identify missing required variables', () => {
      process.env.NODE_ENV = 'development';

    // Restore process.exit
    mockExit.mockRestore();
  });

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('exits with error when required variables are missing', () => {
      // Remove required variables
      delete process.env.NHOST_ADMIN_SECRET;
      delete process.env.AUTH_JWKS_URL;

      performStartupCheck();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        expect.arrayContaining(['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL'])
      );
    });

    test('should not exit in development mode when variables are missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NHOST_ADMIN_SECRET;

      performStartupCheck();

      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should exit in production mode when required variables are missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NHOST_ADMIN_SECRET;

      performStartupCheck();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        expect.arrayContaining(['NHOST_ADMIN_SECRET'])
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Server cannot start in production without these variables.'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should not exit when all required variables are present', () => {
      process.env.NODE_ENV = 'production';
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://example.com/jwks';

      performStartupCheck();

      expect(mockExit).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
    });
  });

  describe('Integration variables validation', () => {
    beforeEach(() => {
      // Ensure required variables are present for these tests
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://example.com/jwks';
    });

    test('should log warnings for missing integration keys in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.OPENAI_API_KEY;

      performStartupCheck();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  WARNING: Missing integration keys in production. Features will fail:',
        expect.arrayContaining(['GOOGLE_CLIENT_ID', 'OPENAI_API_KEY'])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      expect(mockError).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL']
      );
      expect(mockError).toHaveBeenCalledWith(
        'Server cannot start in production without these variables.'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('logs warning when integration variables are missing', () => {
      // Set required variables
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://test.example.com';

      // Remove integration variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.OPENAI_API_KEY;

      performStartupCheck();

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  WARNING: Missing integration keys in production. Features will fail:',
        ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY']
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('logs success when all variables are present', () => {
      // Set all variables
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://test.example.com';
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.OPENAI_API_KEY = 'test-api-key';

      performStartupCheck();

      expect(mockInfo).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
      expect(mockError).not.toHaveBeenCalled();
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('exits and warns about integrations when both required and integration vars are missing', () => {
      // Remove all variables
      delete process.env.NHOST_ADMIN_SECRET;
      delete process.env.AUTH_JWKS_URL;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.OPENAI_API_KEY;

      performStartupCheck();

      expect(mockError).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL']
      );
      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  WARNING: Missing integration keys in production. Features will fail:',
        ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY']
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('logs error but does not exit when required variables are missing', () => {
      // Remove required variables
      delete process.env.NHOST_ADMIN_SECRET;
      delete process.env.AUTH_JWKS_URL;

      performStartupCheck();

      expect(mockError).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL']
      );
      expect(mockError).not.toHaveBeenCalledWith(
        'Server cannot start in production without these variables.'
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should log info for missing integration keys in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      performStartupCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ℹ️  Missing integration keys (acceptable for local dev):',
        expect.arrayContaining(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should not log warnings when all integration keys are present', () => {
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_CLIENT_ID = 'test-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
      process.env.OPENAI_API_KEY = 'test-key';

      performStartupCheck();

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
    });
  });

  describe('Combined scenarios', () => {
    test('should handle both missing required and integration variables', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NHOST_ADMIN_SECRET;
      delete process.env.GOOGLE_CLIENT_ID;

      performStartupCheck();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        expect.arrayContaining(['NHOST_ADMIN_SECRET'])
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  WARNING: Missing integration keys in production. Features will fail:',
        expect.arrayContaining(['GOOGLE_CLIENT_ID'])
    test('logs info message when integration variables are missing', () => {
      // Set required variables
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://test.example.com';

      // Remove integration variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.OPENAI_API_KEY;

      performStartupCheck();

      expect(mockInfo).toHaveBeenCalledWith(
        'ℹ️  Missing integration keys (acceptable for local dev):',
        ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY']
      );
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('logs success when all variables are present', () => {
      // Set all variables
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://test.example.com';
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.OPENAI_API_KEY = 'test-api-key';

      performStartupCheck();

      expect(mockInfo).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
      expect(mockError).not.toHaveBeenCalled();
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    test('handles partial required variables correctly', () => {
      process.env.NODE_ENV = 'production';
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      delete process.env.AUTH_JWKS_URL;

      performStartupCheck();

      expect(mockError).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        ['AUTH_JWKS_URL']
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should handle NODE_ENV not set (defaults to non-production behavior)', () => {
      delete process.env.NODE_ENV;
      delete process.env.NHOST_ADMIN_SECRET;

      performStartupCheck();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should handle all variables present in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://example.com/jwks';
      process.env.GOOGLE_CLIENT_ID = 'test-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
      process.env.OPENAI_API_KEY = 'test-key';

      performStartupCheck();

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
    test('handles partial integration variables correctly', () => {
      process.env.NODE_ENV = 'production';
      process.env.NHOST_ADMIN_SECRET = 'test-secret';
      process.env.AUTH_JWKS_URL = 'https://test.example.com';
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.OPENAI_API_KEY;

      performStartupCheck();

      expect(mockWarn).toHaveBeenCalledWith(
        '⚠️  WARNING: Missing integration keys in production. Features will fail:',
        ['GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY']
      );
      expect(mockInfo).toHaveBeenCalledWith(
        '✅ Environment configuration check passed.'
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('handles undefined NODE_ENV as development', () => {
      delete process.env.NODE_ENV;
      delete process.env.NHOST_ADMIN_SECRET;
      delete process.env.AUTH_JWKS_URL;

      performStartupCheck();

      expect(mockError).toHaveBeenCalledWith(
        '❌ FATAL: Missing required environment variables:',
        ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL']
      );
      // Should not exit in development (undefined NODE_ENV defaults to non-production)
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
