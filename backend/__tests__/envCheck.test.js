/* eslint-env node, jest */

describe('performStartupCheck', () => {
  let mockLogger;
  let originalEnv;
  let performStartupCheck;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.resetModules();
    jest.doMock('../utils/logger.js', () => ({
      createLogger: jest.fn(() => mockLogger),
    }));

    ({ performStartupCheck } = await import('../utils/envCheck.js'));
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    jest.clearAllMocks();
  });

  test('passes when required vars and DATABASE_URL are present', () => {
    process.env.NODE_ENV = 'development';
    process.env.NHOST_ADMIN_SECRET = 'secret';
    process.env.NHOST_SUBDOMAIN = 'subdomain';
    process.env.NHOST_REGION = 'region';
    process.env.AUTH_JWKS_URL = 'https://example.com';
    process.env.DATABASE_URL = 'postgresql://localhost/test';

    performStartupCheck();

    expect(mockLogger.info).toHaveBeenCalledWith('✅ Startup Environment Check Passed');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  test('errors when required variables are missing in production', () => {
    process.env.NODE_ENV = 'production';
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    performStartupCheck();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ FATAL: Missing env vars:',
      expect.arrayContaining(['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL'])
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
