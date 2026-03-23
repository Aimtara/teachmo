// JS compatibility shim – see tenantScope.ts for the typed source.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuidOrNull(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return UUID_RE.test(v) ? v : null;
}

export function getTenantScope(req) {
  const allowTenantHeaderFallback =
    process.env.ALLOW_TENANT_HEADER_FALLBACK === 'true' &&
    process.env.NODE_ENV !== 'production';

  // Prefer authenticated claims for tenant scoping
  const authDistrictId = asUuidOrNull(req.auth?.districtId || req.auth?.organizationId);
  const tenantDistrictId = asUuidOrNull(req.tenant?.organizationId);
  let districtId = authDistrictId || tenantDistrictId;

  // Only allow header/query overrides when explicitly enabled in non-production
  if (!districtId && allowTenantHeaderFallback) {
    districtId = asUuidOrNull(
      req.get('x-district-id') ||
        req.get('x-tenant-district-id') ||
        req.query.district_id ||
        req.query.districtId
    );
  }

  const authSchoolId = asUuidOrNull(req.auth?.schoolId);
  const tenantSchoolId = asUuidOrNull(req.tenant?.schoolId);
  let schoolId = authSchoolId || tenantSchoolId;

  if (!schoolId && allowTenantHeaderFallback) {
    schoolId = asUuidOrNull(
      req.get('x-school-id') ||
        req.get('x-tenant-school-id') ||
        req.query.school_id ||
        req.query.schoolId
    );
  }

  let userId = asUuidOrNull(req.auth?.userId);
  if (!userId && allowTenantHeaderFallback) {
    userId = asUuidOrNull(
      req.get('x-user-id') ||
        req.query.user_id ||
        req.query.userId
    );
  }

  // Admin user ID should not be overridden by headers in production.
  let adminUserId = asUuidOrNull(req.auth?.userId);
  if (!adminUserId && allowTenantHeaderFallback) {
    adminUserId = asUuidOrNull(
      req.get('x-admin-user-id') ||
        req.get('x-user-id')
    );
  }
  return { districtId, schoolId, userId, adminUserId };
}

export function requireDistrictScope(req, res, next) {
  const { districtId } = getTenantScope(req);
  if (!districtId) {
    return res.status(400).json({ error: 'district_id is required' });
  }
  next();
}
