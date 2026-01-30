/* eslint-env node */
// Auth middleware for the (legacy) Express API.
//
// Security posture:
// - In production, Bearer JWTs MUST verify (signature + exp + optional iss/aud).
// - In production, x-hasura-* request headers are NOT trusted by default.
//   (Only enable TRUST_HASURA_HEADERS if this server is behind Hasura in a private network.)

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { resolveRoleScopes } from '../rbac.js';
import { auditEvent } from '../security/audit.js';
function getClaim(obj, key) {
  if (!obj) return null;
  if (obj[key] !== undefined) return obj[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function normalizeScopes(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === 'string') {
    return input
      .split(/[ ,\n\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

const envLower = (process.env.NODE_ENV || 'development').toLowerCase();
const isProd = envLower === 'production';
const isMockAuth = process.env.AUTH_MODE === 'mock' && envLower === 'test';

// JWT verification configuration
const jwksUrl = process.env.AUTH_JWKS_URL || process.env.NHOST_JWKS_URL || '';
const issuer = process.env.AUTH_ISSUER || process.env.NHOST_JWT_ISSUER || undefined;
const audience = process.env.AUTH_AUDIENCE || process.env.NHOST_JWT_AUDIENCE || undefined;

let jwks = null;
if (jwksUrl) {
  jwks = createRemoteJWKSet(new URL(jwksUrl));
}

async function verifyBearerToken(token) {
  if (!token) return null;
  if (isMockAuth && process.env.AUTH_MOCK_SECRET) {
    const secret = new TextEncoder().encode(process.env.AUTH_MOCK_SECRET);
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[MockAuth] Token verification failed:', msg);
      return null;
    }
  }
  if (!jwks) {
    // In production, missing JWKS is a hard failure.
    if (isProd) {
      throw new Error('AUTH_JWKS_URL is required in production to verify JWTs');
    }

    // In non-prod you may opt-in to insecure decode for local testing.
    const allowInsecure = String(process.env.ALLOW_INSECURE_JWT_DECODE || '').toLowerCase() === 'true';
    if (!allowInsecure) return null;

    // Minimal, *insecure* decode (dev-only) — does NOT validate signature.
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  });
  return payload;
}

function claimsFromHasuraHeaders(req) {
  // Only trust these headers when explicitly enabled (e.g., private network behind Hasura).
  const trustHeaders = String(process.env.TRUST_HASURA_HEADERS || '').toLowerCase() === 'true';
  if (!trustHeaders) return null;

  // A basic safety check: require an internal shared secret if configured.
  const sharedSecret = process.env.INTERNAL_REQUEST_SHARED_SECRET;
  if (sharedSecret) {
    const provided = req.headers['x-internal-shared-secret'];
    if (!provided || String(provided) !== String(sharedSecret)) return null;
  }

  // Hasura headers are case-insensitive in Node; use req.headers as-is.
  const hasUser = Boolean(req.headers['x-hasura-user-id']);
  return hasUser ? req.headers : null;
}

function extractAuthContext(jwtClaims) {
  const hasuraClaims = jwtClaims?.['https://hasura.io/jwt/claims'] || jwtClaims?.['https://nhost.io/jwt/claims'] || {};
  const role =
    getClaim(jwtClaims, 'x-hasura-role') ||
    getClaim(hasuraClaims, 'x-hasura-default-role') ||
    getClaim(jwtClaims, 'role') ||
    getClaim(jwtClaims, 'x-role');
  const userId =
    getClaim(jwtClaims, 'x-hasura-user-id') ||
    getClaim(hasuraClaims, 'x-hasura-user-id') ||
    getClaim(jwtClaims, 'user_id') ||
    getClaim(jwtClaims, 'sub');
  const profileId =
    getClaim(hasuraClaims, 'x-hasura-profile-id') ||
    getClaim(jwtClaims, 'x-profile-id') ||
    getClaim(jwtClaims, 'profile_id');
  const organizationId =
    getClaim(hasuraClaims, 'x-hasura-organization-id') ||
    getClaim(hasuraClaims, 'x-hasura-org-id') ||
    getClaim(jwtClaims, 'organization_id') ||
    getClaim(jwtClaims, 'org_id');
  const districtId =
    getClaim(hasuraClaims, 'x-hasura-district-id') ||
    getClaim(jwtClaims, 'x-district-id') ||
    getClaim(jwtClaims, 'district_id');
  const schoolId =
    getClaim(hasuraClaims, 'x-hasura-school-id') ||
    getClaim(jwtClaims, 'x-school-id') ||
    getClaim(jwtClaims, 'school_id');

  const scopesRaw =
    getClaim(hasuraClaims, 'x-hasura-scopes') ||
    getClaim(jwtClaims, 'x-hasura-scopes') ||
    getClaim(jwtClaims, 'scopes');
  const scopes = Array.from(
    new Set([...normalizeScopes(scopesRaw), ...resolveRoleScopes(role ? String(role) : null)])
  );

  return {
    role: role ? String(role) : null,
    userId: userId ? String(userId) : null,
    profileId: profileId ? String(profileId) : null,
    organizationId: organizationId ? String(organizationId) : null,
    districtId: districtId ? String(districtId) : null,
    schoolId: schoolId ? String(schoolId) : null,
    scopes,
  };
}

async function resolveClaims(req) {
  const headerAuth = req.headers.authorization || '';
  const bearer = headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : null;

  // Priority 1: verify a Bearer token (recommended in all deployments)
  if (bearer) {
    const verifiedPayload = await verifyBearerToken(bearer);
    if (verifiedPayload) return verifiedPayload;
  }

  // Priority 2: optionally trust Hasura headers (only when explicitly enabled)
  const hasuraHeaders = claimsFromHasuraHeaders(req);
  if (hasuraHeaders) return hasuraHeaders;

  // No auth
  return {};
}

export async function attachAuthContext(req, res, next) {
  try {
    const jwtClaims = await resolveClaims(req);
    req.auth = extractAuthContext(jwtClaims);
    next();
  } catch (err) {
    // Fail closed in production; fail soft in dev to reduce local friction.
    if (isProd) {
      return res.status(401).json({ error: 'invalid auth' });
    }
    req.auth = {
      role: null,
      userId: null,
      profileId: null,
      organizationId: null,
      districtId: null,
      schoolId: null,
      scopes: []
    };
    next();
  }
}

export function requireAuth(req, res, next) {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'missing auth' });
  next();
}

export function requireAdmin(req, res, next) {
  const role = req.auth?.role;
  if (!role) return res.status(401).json({ error: 'missing auth' });
  const allowed = ['system_admin', 'district_admin', 'school_admin', 'admin'];
  if (!allowed.includes(role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

let orchestratorJwks = null;

function getRemoteJwks() {
  const url = process.env.AUTH_JWKS_URL;
  if (!url) return null;
  if (!orchestratorJwks) orchestratorJwks = createRemoteJWKSet(new URL(url));
  return orchestratorJwks;
}

function extractUserId(payload) {
  const hasura = payload?.['https://hasura.io/jwt/claims'];
  const uid = hasura?.['x-hasura-user-id'] || payload?.sub || payload?.userId;
  return typeof uid === 'string' ? uid : null;
}

function extractRoles(payload) {
  const hasura = payload?.['https://hasura.io/jwt/claims'];
  const roles = hasura?.['x-hasura-allowed-roles'] || payload?.roles || [];
  return Array.isArray(roles) ? roles : [];
}

export async function requireAuthOrService(req, res, next) {
  const svcKey = req.get('X-Teachmo-Service-Key');
  if (process.env.TEACHMO_SERVICE_KEY && svcKey === process.env.TEACHMO_SERVICE_KEY) {
    req.auth = { isService: true, userId: null, roles: ['service'] };
    return next();
  }

  const authHeader = req.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    await auditEvent(req, { eventType: 'auth_missing_token', severity: 'warn', statusCode: 401 });
    return res.status(401).json({ error: 'missing_bearer_token' });
  }

  const jwksSet = getRemoteJwks();
  if (!jwksSet) return res.status(500).json({ error: 'AUTH_JWKS_URL_not_configured' });

  try {
    const issuer = process.env.AUTH_JWT_ISSUER || undefined;
    const audience = process.env.AUTH_JWT_AUDIENCE || undefined;

    const { payload } = await jwtVerify(token, jwksSet, {
      issuer,
      audience
    });

    const userId = extractUserId(payload);
    if (!userId) return res.status(401).json({ error: 'token_missing_user_id' });

    req.auth = {
      isService: false,
      userId,
      roles: extractRoles(payload),
      raw: payload
    };

    return next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await auditEvent(req, {
      eventType: 'auth_invalid_token',
      severity: 'warn',
      statusCode: 401,
      meta: { detail: msg }
    });
    return res.status(401).json({ error: 'invalid_token', detail: msg });
  }
}
