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
  });
});
