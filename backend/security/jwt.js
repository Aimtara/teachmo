/* eslint-env node */
/**
 * Shared JWT verification utilities for both HTTP and WebSocket authentication.
 * 
 * This module consolidates JWT verification logic to ensure consistent behavior
 * across all authentication paths in the application.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const textEncoder = new TextEncoder();

/**
 * Check if we're in mock auth mode (test environment only)
 */
function isMockAuthMode() {
  const mode = String(process.env.AUTH_MODE || '').toLowerCase();
  return mode === 'mock' && String(process.env.NODE_ENV || '').toLowerCase() === 'test';
}

/**
 * Check if we're in production environment
 */
function isProduction() {
  const envLower = (process.env.NODE_ENV || 'development').toLowerCase();
  return envLower === 'production';
}

// JWT verification configuration - initialized once on module load
const jwksUrl = process.env.AUTH_JWKS_URL || process.env.NHOST_JWKS_URL || '';
const issuer = process.env.AUTH_ISSUER || process.env.NHOST_JWT_ISSUER || undefined;
const audience = process.env.AUTH_AUDIENCE || process.env.NHOST_JWT_AUDIENCE || undefined;

let jwks = null;
if (jwksUrl) {
  jwks = createRemoteJWKSet(new URL(jwksUrl));
}

/**
 * Verify a JWT token with support for multiple verification modes.
 * 
 * @param {string} token - The JWT token to verify
 * @param {Object} options - Verification options
 * @param {boolean} options.allowSSOFallback - Allow SSO_JWT_SECRET fallback (default: false)
 * @param {boolean} options.allowInsecureDev - Allow insecure decode in dev (default: false)
 * @returns {Promise<Object|null>} The verified JWT payload or null if verification fails
 * @throws {Error} If verification fails due to invalid token (signature, expiry, claims)
 * 
 * Note: This function returns null (rather than throwing) when:
 * - No token is provided
 * - JWKS is not configured in non-production
 * This allows callers to distinguish between "no auth configured" vs "auth failed".
 */
export async function verifyJWT(token, options = {}) {
  if (!token) return null;

  const { allowSSOFallback = false, allowInsecureDev = false } = options;

  // Priority 1: Test-only mock verification with HS256
  if (isMockAuthMode()) {
    const secret = String(process.env.AUTH_MOCK_SECRET || '').trim();
    if (!secret) {
      throw new Error('AUTH_MOCK_SECRET is required when AUTH_MODE=mock');
    }
    const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
      algorithms: ['HS256'],
    });
    return payload;
  }

  // Priority 2: SSO secret fallback (only if explicitly enabled)
  if (allowSSOFallback) {
    const ssoSecret = String(process.env.SSO_JWT_SECRET || '').trim();
    if (ssoSecret) {
      try {
        const ssoIssuer =
          (process.env.SSO_JWT_ISSUER || process.env.AUTH_ISSUER || '').trim() || 'teachmo-sso';
        const ssoAudience =
          (process.env.SSO_JWT_AUDIENCE || process.env.AUTH_AUDIENCE || '').trim() || 'teachmo-api';
        const { payload } = await jwtVerify(token, textEncoder.encode(ssoSecret), {
          issuer: ssoIssuer,
          audience: ssoAudience,
          algorithms: ['HS256'],
        });
        return payload;
      } catch {
        // Fall through to JWKS verification
      }
    }
  }

  // Priority 3: JWKS verification (primary method)
  if (!jwks) {
    // In production, missing JWKS is a hard failure
    if (isProduction()) {
      throw new Error('AUTH_JWKS_URL is required in production to verify JWTs');
    }

    // In dev, optionally allow insecure decode for local testing
    if (allowInsecureDev) {
      const allowInsecure = String(process.env.ALLOW_INSECURE_JWT_DECODE || '').toLowerCase() === 'true';
      if (allowInsecure) {
        // Minimal, *insecure* decode (dev-only) — does NOT validate signature
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) return null;
        const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        return JSON.parse(json);
      }
    }

    // No JWKS and no insecure fallback - return null
    return null;
  }

  // Standard JWKS verification
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  });
  return payload;
}

/**
 * Extract token from HTTP request headers.
 * Supports both Authorization header and query parameter.
 * 
 * @param {Object} req - Express request object or similar
 * @param {Object} options - Extraction options
 * @param {boolean} options.allowQuery - Allow token from query parameter (default: false)
 * @returns {string|null} The extracted token or null
 */
export function extractToken(req, options = {}) {
  const { allowQuery = false } = options;

  // Priority 1: Authorization header (Bearer token)
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Priority 2: Query parameter (only if explicitly allowed, e.g., for WebSocket)
  if (allowQuery && req.url) {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const queryToken = url.searchParams.get('token');
      if (queryToken) return queryToken;
    } catch {
      // Invalid URL, continue
    }
  }

  return null;
}

/**
 * Verify a JWT token from an HTTP request.
 * 
 * @param {Object} req - Express request object or similar
 * @param {Object} options - Verification options (see verifyJWT)
 * @returns {Promise<Object|null>} The verified JWT payload or null
 */
export async function verifyRequestToken(req, options = {}) {
  const token = extractToken(req, options);
  return verifyJWT(token, options);
}
