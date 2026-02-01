/* eslint-env node, jest */

// Use var for hoisting
var mockLogger; // eslint-disable-line no-var

jest.mock('../utils/logger.js', () => ({
  createLogger: jest.fn(() => {
    if (!mockLogger) {
      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
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
    // Save original env (only the keys we'll be testing)
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      NHOST_ADMIN_SECRET: process.env.NHOST_ADMIN_SECRET,
      NHOST_SUBDOMAIN: process.env.NHOST_SUBDOMAIN,
      NHOST_REGION: process.env.NHOST_REGION,
      AUTH_JWKS_URL: process.env.AUTH_JWKS_URL,
    };
    
    // Clear env vars we're testing
    delete process.env.NODE_ENV;
    delete process.env.NHOST_ADMIN_SECRET;
    delete process.env.NHOST_SUBDOMAIN;
    delete process.env.NHOST_REGION;
    delete process.env.AUTH_JWKS_URL;
    
    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Clear mock calls
    if (mockLogger) {
      mockLogger.info.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.error.mockClear();
    }
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
    mockExit.mockRestore();
  });

  it('should pass when all required vars are present', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should warn when vars are missing in non-production', () => {
    process.env.NODE_ENV = 'development';
    // Missing all required vars

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '⚠️  WARNING: Missing required environment variables in non-production environment. This is tolerated but may cause issues:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should exit in production when vars are missing', () => {
    process.env.NODE_ENV = 'production';
    // Missing all required vars

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Server cannot start in production without these variables.'
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should warn for partial missing vars in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    // Missing other vars

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '⚠️  WARNING: Missing required environment variables in non-production environment. This is tolerated but may cause issues:',
      expect.arrayContaining(['NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should exit for partial missing vars in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    // Missing NHOST_REGION and AUTH_JWKS_URL

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing required environment variables:',
      expect.arrayContaining(['NHOST_REGION', 'AUTH_JWKS_URL'])
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Server cannot start in production without these variables.'
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith('✅ Environment configuration check passed.');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle undefined NODE_ENV as non-production', () => {
    delete process.env.NODE_ENV;
    // Missing all required vars

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });
});
