/* eslint-env node */
function getClaim(obj, key) {
  if (!obj) return null;
  if (obj[key]) return obj[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function resolveClaims(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let decoded = null;
  if (token) {
    try {
      const payload = token.split('.')[1];
      const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      decoded = JSON.parse(json);
    } catch (err) {
      decoded = null;
    }
  }

  const jwtClaims = req.headers['x-hasura-user-id']
    ? req.headers
    : decoded || {};
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
  const orgId =
    getClaim(hasuraClaims, 'x-hasura-organization-id') ||
    getClaim(hasuraClaims, 'x-hasura-org-id') ||
    getClaim(jwtClaims, 'x-org-id');
  const schoolId =
    getClaim(hasuraClaims, 'x-hasura-school-id') ||
    getClaim(jwtClaims, 'x-school-id');

  const scopesRaw =
    getClaim(hasuraClaims, 'x-hasura-scopes') ||
    getClaim(jwtClaims, 'x-hasura-scopes') ||
    getClaim(jwtClaims, 'scopes');
  const scopes = normalizeScopes(scopesRaw);

  return {
    role,
    userId,
    organizationId: orgId,
    schoolId,
    scopes
  };
}

function normalizeScopes(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === 'string') {
    return input
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function attachAuthContext(req, res, next) {
  req.auth = resolveClaims(req);
  next();
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
