/* eslint-env node */
export function requireTenant(req, res, next) {
  // Tenancy MUST come from verified auth claims in production.
  // Header-based tenancy is a dev-only escape hatch.
  const orgFromClaims = req.auth?.districtId || req.auth?.organizationId || null;
  const schoolFromClaims = req.auth?.schoolId || null;

  const allowHeaders =
    String(process.env.ALLOW_TENANT_HEADERS || '').toLowerCase() === 'true' &&
    (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';

  const orgFromHeader = allowHeaders
    ? (req.headers['x-teachmo-org-id'] || req.headers['x-teachmo-tenant-id'] || null)
    : null;
  const schoolFromHeader = allowHeaders ? (req.headers['x-teachmo-school-id'] || null) : null;

  if (orgFromClaims && orgFromHeader && String(orgFromClaims) !== String(orgFromHeader)) {
    return res.status(400).json({ error: 'tenant mismatch (org)' });
  }
  if (schoolFromClaims && schoolFromHeader && String(schoolFromClaims) !== String(schoolFromHeader)) {
    return res.status(400).json({ error: 'tenant mismatch (school)' });
  }

  const organizationId = orgFromClaims || orgFromHeader || null;
  const schoolId = schoolFromClaims || schoolFromHeader || null;

  if (!organizationId) return res.status(401).json({ error: 'tenant required' });

  req.tenant = { organizationId, schoolId };
  next();
}
