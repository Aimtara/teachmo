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
