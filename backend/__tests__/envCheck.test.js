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
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
