/* eslint-env node */
import { SignJWT } from 'jose';

function buildHasuraClaims({ userId, role, organizationId, schoolId }) {
  const claims = {
    'x-hasura-user-id': userId,
    'x-hasura-default-role': role,
    'x-hasura-allowed-roles': [role],
    'x-hasura-organization-id': organizationId,
  };

  if (schoolId) {
    claims['x-hasura-school-id'] = schoolId;
  }

  return claims;
}

function resolveSecret() {
  const secret = process.env.SSO_JWT_SECRET || process.env.AUTH_MOCK_SECRET || '';
  if (!secret) {
    throw new Error('SSO_JWT_SECRET is required to issue SSO tokens');
  }
  return new TextEncoder().encode(secret);
}

export async function issueSsoJwt({
  userId,
  role,
  organizationId,
  schoolId,
  provider,
  email,
}) {
  if (!userId || !role || !organizationId) {
    throw new Error('missing required claims for SSO token');
  }

  const now = Math.floor(Date.now() / 1000);
  const rawTtlMinutes = process.env.SSO_JWT_TTL_MINUTES;
  const parsedTtlMinutes = Number(rawTtlMinutes);
  const safeTtlMinutes =
    Number.isFinite(parsedTtlMinutes) && parsedTtlMinutes > 0 ? parsedTtlMinutes : 60;
  const exp = now + Math.max(safeTtlMinutes, 5) * 60;
  const issuer = process.env.SSO_JWT_ISSUER || process.env.AUTH_ISSUER || 'teachmo-sso';
  const audience = process.env.SSO_JWT_AUDIENCE || process.env.AUTH_AUDIENCE || 'teachmo-api';

  return new SignJWT({
    role,
    provider,
    email,
    'https://hasura.io/jwt/claims': buildHasuraClaims({ userId, role, organizationId, schoolId }),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(resolveSecret());
}
