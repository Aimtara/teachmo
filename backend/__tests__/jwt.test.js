/* eslint-env node */
/**
 * Tests for shared JWT verification utilities
 */

import { jest } from '@jest/globals';
import { SignJWT } from 'jose';

// Mock environment before imports
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Shared JWT verification', () => {
  describe('verifyJWT', () => {
    it('verifies mock auth tokens in test mode', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret-123';

      const { verifyJWT } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'user-123', role: 'teacher' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('test-secret-123'));

      const payload = await verifyJWT(token);
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe('teacher');
    });

    it('throws error when AUTH_MOCK_SECRET is missing in mock mode', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      delete process.env.AUTH_MOCK_SECRET;

      const { verifyJWT } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'user-123' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('any-secret'));

      await expect(verifyJWT(token)).rejects.toThrow('AUTH_MOCK_SECRET is required');
    });

    it('returns null for null token', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret';

      const { verifyJWT } = await import('../security/jwt.js');
      
      const result = await verifyJWT(null);
      expect(result).toBeNull();
    });

    it('returns null for undefined token', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret';

      const { verifyJWT } = await import('../security/jwt.js');
      
      const result = await verifyJWT(undefined);
      expect(result).toBeNull();
    });

    it('throws error for invalid JWT in production without JWKS', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_JWKS_URL;
      delete process.env.NHOST_JWKS_URL;

      const { verifyJWT } = await import('../security/jwt.js');

      await expect(verifyJWT('invalid.token.here')).rejects.toThrow(
        'AUTH_JWKS_URL is required in production'
      );
    });

    it('returns null in development without JWKS and without insecure fallback', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.AUTH_JWKS_URL;
      delete process.env.NHOST_JWKS_URL;
      delete process.env.ALLOW_INSECURE_JWT_DECODE;

      const { verifyJWT } = await import('../security/jwt.js');

      const result = await verifyJWT('invalid.token.here', { allowInsecureDev: false });
      expect(result).toBeNull();
    });

    it('decodes token insecurely in development when allowed', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_INSECURE_JWT_DECODE = 'true';
      delete process.env.AUTH_JWKS_URL;
      delete process.env.NHOST_JWKS_URL;

      const { verifyJWT } = await import('../security/jwt.js');

      // Create a token without signature verification
      const payload = { sub: 'user-456', role: 'parent' };
      const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${header}.${body}.fake-signature`;

      const result = await verifyJWT(token, { allowInsecureDev: true });
      expect(result).toBeDefined();
      expect(result.sub).toBe('user-456');
      expect(result.role).toBe('parent');
    });

    it('supports SSO secret fallback when enabled', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MODE = 'jwks'; // Not mock mode
      process.env.SSO_JWT_SECRET = 'sso-secret-789';
      process.env.SSO_JWT_ISSUER = 'teachmo-sso';
      process.env.SSO_JWT_AUDIENCE = 'teachmo-api';
      delete process.env.AUTH_JWKS_URL;

      const { verifyJWT } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'sso-user-123', role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('teachmo-sso')
        .setAudience('teachmo-api')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('sso-secret-789'));

      const payload = await verifyJWT(token, { allowSSOFallback: true });
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('sso-user-123');
      expect(payload.role).toBe('admin');
    });

    it('returns null when SSO fallback is disabled', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SSO_JWT_SECRET = 'sso-secret-789';
      delete process.env.AUTH_JWKS_URL;

      const { verifyJWT } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'sso-user-123' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('sso-secret-789'));

      const payload = await verifyJWT(token, { allowSSOFallback: false });
      expect(payload).toBeNull();
    });
  });

  describe('extractToken', () => {
    it('extracts token from Authorization header', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        headers: {
          authorization: 'Bearer my-jwt-token-123',
        },
      };

      const token = extractToken(req);
      expect(token).toBe('my-jwt-token-123');
    });

    it('returns null when Authorization header is missing', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        headers: {},
      };

      const token = extractToken(req);
      expect(token).toBeNull();
    });

    it('returns null when Authorization header does not start with Bearer', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        headers: {
          authorization: 'Basic username:password',
        },
      };

      const token = extractToken(req);
      expect(token).toBeNull();
    });

    it('extracts token from query parameter when allowed', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        url: '/ws?token=query-token-456',
        headers: {
          host: 'localhost:4000',
        },
      };

      const token = extractToken(req, { allowQuery: true });
      expect(token).toBe('query-token-456');
    });

    it('does not extract query token when not allowed', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        url: '/ws?token=query-token-456',
        headers: {
          host: 'localhost:4000',
        },
      };

      const token = extractToken(req, { allowQuery: false });
      expect(token).toBeNull();
    });

    it('prefers Authorization header over query parameter', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        url: '/ws?token=query-token-456',
        headers: {
          authorization: 'Bearer header-token-789',
          host: 'localhost:4000',
        },
      };

      const token = extractToken(req, { allowQuery: true });
      expect(token).toBe('header-token-789');
    });

    it('handles invalid URL gracefully', async () => {
      const { extractToken } = await import('../security/jwt.js');

      const req = {
        url: 'not-a-valid-url',
        headers: {},
      };

      const token = extractToken(req, { allowQuery: true });
      expect(token).toBeNull();
    });
  });

  describe('verifyRequestToken', () => {
    it('verifies token from request in mock mode', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret-999';

      const { verifyRequestToken } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'request-user-123', role: 'student' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('test-secret-999'));

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const payload = await verifyRequestToken(req);
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('request-user-123');
      expect(payload.role).toBe('student');
    });

    it('verifies token from query parameter when allowed', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret-999';

      const { verifyRequestToken } = await import('../security/jwt.js');

      const textEncoder = new TextEncoder();
      const token = await new SignJWT({ sub: 'query-user-789' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(textEncoder.encode('test-secret-999'));

      const req = {
        url: `/ws?token=${token}`,
        headers: {
          host: 'localhost:4000',
        },
      };

      const payload = await verifyRequestToken(req, { allowQuery: true });
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('query-user-789');
    });

    it('returns null when no token is present', async () => {
      process.env.AUTH_MODE = 'mock';
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_SECRET = 'test-secret';

      const { verifyRequestToken } = await import('../security/jwt.js');

      const req = {
        headers: {},
      };

      const payload = await verifyRequestToken(req);
      expect(payload).toBeNull();
    });
  });
});
