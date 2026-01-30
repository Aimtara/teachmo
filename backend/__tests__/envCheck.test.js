/* eslint-env node, jest */
import { performStartupCheck } from '../utils/envCheck.js';
import { createLogger } from '../utils/logger.js';

jest.mock('../utils/logger.js');

describe('performStartupCheck', () => {
  let mockLogger;
  let originalEnv;

  beforeEach(() => {
    // Save original env (only the keys we'll be testing)
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      NHOST_ADMIN_SECRET: process.env.NHOST_ADMIN_SECRET,
      NHOST_SUBDOMAIN: process.env.NHOST_SUBDOMAIN,
      NHOST_REGION: process.env.NHOST_REGION,
      AUTH_JWKS_URL: process.env.AUTH_JWKS_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
    
    // Clear env vars we're testing
    delete process.env.NODE_ENV;
    delete process.env.NHOST_ADMIN_SECRET;
    delete process.env.NHOST_SUBDOMAIN;
    delete process.env.NHOST_REGION;
    delete process.env.AUTH_JWKS_URL;
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.OPENAI_API_KEY;

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    createLogger.mockReturnValue(mockLogger);
  });

  afterEach(() => {
    // Restore original env values
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
    jest.clearAllMocks();
  });

  it('should pass with DATABASE_URL and all required vars', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should pass with discrete DB variables and all required vars', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USER = 'user';
    process.env.DB_PASSWORD = 'password';
    process.env.DB_NAME = 'dbname';

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should error when database config is missing in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    // No database vars

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL:',
      'Database configuration: Requires either DATABASE_URL or all of (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      '⚠️  Continuing in non-production mode, but operations like migrations and database-dependent schedulers will fail.'
    );
  });

  it('should exit in production when database config is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    // No database vars

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL:',
      'Database configuration: Requires either DATABASE_URL or all of (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Server cannot start in production without these variables.'
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it('should error when only some discrete DB variables are present', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    // Partial discrete vars - missing DB_USER, DB_PASSWORD, DB_NAME
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL:',
      'Database configuration: Requires either DATABASE_URL or all of (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      '⚠️  Continuing in non-production mode, but operations like migrations and database-dependent schedulers will fail.'
    );
  });

  it('should warn about missing integration vars in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    // No integration vars

    performStartupCheck();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      '⚠️  WARNING: Missing integration keys in production. Features will fail:',
      expect.arrayContaining(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'])
    );
    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
  });

  it('should log info about missing integration vars in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    // No integration vars

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith(
      'ℹ️  Missing integration keys (acceptable for local dev):',
      expect.arrayContaining(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'])
    );
    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
  });

  it('should accept partial discrete DB variables if DATABASE_URL is present', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.DB_HOST = 'localhost'; // Partial discrete vars
    // DATABASE_URL takes precedence

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should error when required Nhost variables are missing', () => {
    process.env.NODE_ENV = 'development';
    // Missing NHOST_ADMIN_SECRET and NHOST_SUBDOMAIN
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN'])
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      '⚠️  Continuing in non-production mode, but operations like migrations and database-dependent schedulers will fail.'
    );
  });

  it('should exit in production when required Nhost variables are missing', () => {
    process.env.NODE_ENV = 'production';
    // Missing all REQUIRED_VARS
    process.env.DATABASE_URL = 'postgresql://localhost/test';

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Server cannot start in production without these variables.'
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
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
  let mockExit;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset logger mocks
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
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
