/* eslint-env node */
export function requireTenant(req, res, next) {
  const orgFromClaims = req.auth?.organizationId || null;
  const schoolFromClaims = req.auth?.schoolId || null;

  const orgFromHeader = req.headers['x-teachmo-org-id'] || req.headers['x-teachmo-tenant-id'] || null;
  const schoolFromHeader = req.headers['x-teachmo-school-id'] || null;

  if (orgFromClaims && orgFromHeader && String(orgFromClaims) !== String(orgFromHeader)) {
    return res.status(400).json({ error: 'tenant mismatch (org)' });
  }
  if (schoolFromClaims && schoolFromHeader && String(schoolFromClaims) !== String(schoolFromHeader)) {
    return res.status(400).json({ error: 'tenant mismatch (school)' });
  }

  const organizationId = orgFromClaims || orgFromHeader || null;
  const schoolId = schoolFromClaims || schoolFromHeader || null;

  if (!organizationId) {
    return res.status(400).json({ error: 'tenant required' });
  }

  req.tenant = { organizationId, schoolId };
  next();
}
