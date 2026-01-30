/* eslint-env node */

// Shared helper for scoping partner/admin routes by tenant.
// We scope by district for now because the partner persistence tables are keyed by district_id.

// Validates canonical UUID string format (8-4-4-4-12 hexadecimal pattern).
// Accepts any hex UUID including nil UUID, does not enforce RFC 4122 version/variant bits.
// Consistent with validation used across the codebase.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function asUuidOrNull(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return UUID_RE.test(v) ? v : null;
}

export function getTenantScope(req) {
  const districtId = asUuidOrNull(
    req.tenant?.organizationId ||
      req.get('x-district-id') ||
      req.get('x-tenant-district-id') ||
      req.query.district_id ||
      req.query.districtId
  );
  const schoolId = asUuidOrNull(
    req.tenant?.schoolId ||
      req.get('x-school-id') ||
      req.get('x-tenant-school-id') ||
      req.query.school_id ||
      req.query.schoolId
  );
  const userId = asUuidOrNull(req.auth?.userId || req.get('x-user-id') || req.query.user_id || req.query.userId);
  const adminUserId = asUuidOrNull(req.get('x-admin-user-id') || req.get('x-user-id') || req.auth?.userId);

  return { districtId, schoolId, userId, adminUserId };
}

export function requireDistrictScope(req, res, next) {
  const { districtId } = getTenantScope(req);
  if (!districtId) {
    return res.status(400).json({ error: 'district scope required (x-district-id)' });
  }
  return next();
}
