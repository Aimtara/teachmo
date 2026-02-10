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
import { verifyJWT } from '../security/jwt.js';

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

// LTI-specific JWT verification configuration
const ltiJwksUrl = process.env.LTI_JWKS_URL || '';
const ltiIssuer = process.env.LTI_ISSUER || undefined;
const ltiAudience = process.env.LTI_AUDIENCE || undefined;

let ltiJwks = null;
if (ltiJwksUrl) {
  ltiJwks = createRemoteJWKSet(new URL(ltiJwksUrl));
}

async function verifyBearerToken(token) {
  // Use shared JWT verifier with SSO fallback and insecure dev decode enabled
  return verifyJWT(token, {
    allowSSOFallback: true,
    allowInsecureDev: true,
  });
}

function getLtiRoles(payload) {
  const roles = payload?.['https://purl.imsglobal.org/spec/lti/claim/roles'] || payload?.roles || [];
  return Array.isArray(roles) ? roles : [roles].filter(Boolean);
}

function inferLtiRole(payload) {
  const roles = getLtiRoles(payload);
  const roleText = roles.map((role) => String(role).toLowerCase());
  if (roleText.some((role) => role.includes('instructor') || role.includes('teacher'))) {
    return 'teacher';
  }
  if (roleText.some((role) => role.includes('administrator') || role.includes('admin'))) {
    return 'school_admin';
  }
  return 'student';
}

async function verifyLtiToken(token) {
  if (!token || !ltiJwks) return null;
  const { payload } = await jwtVerify(token, ltiJwks, {
    issuer: ltiIssuer,
    audience: ltiAudience,
  });
  return {
    ...payload,
    role: payload.role || inferLtiRole(payload),
    scopes: payload.scopes || payload.scope || undefined,
  };
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
  const ltiAuth = headerAuth.startsWith('LTI ') ? headerAuth.slice(4) : null;

  // Priority 1: verify a Bearer token (recommended in all deployments)
  if (bearer) {
    const verifiedPayload = await verifyBearerToken(bearer);
    if (verifiedPayload) return verifiedPayload;
  }

  // Priority 1b: verify an LTI token when provided (for LMS launch flows)
  const ltiToken =
    ltiAuth ||
    req.headers['x-lti-id-token'] ||
    req.headers['x-lti-token'] ||
    req.body?.id_token;
  if (ltiToken) {
    const verifiedPayload = await verifyLtiToken(ltiToken);
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

export function requireSystemAdmin(req, res, next) {
  const role = req.auth?.role;
  if (!role) return res.status(401).json({ error: 'missing auth' });
  if (role !== 'system_admin') return res.status(403).json({ error: 'forbidden' });
  next();
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

  try {
    // Use shared JWT verifier (no SSO or insecure fallback for this path)
    const payload = await verifyJWT(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'invalid_token' });
    }

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
