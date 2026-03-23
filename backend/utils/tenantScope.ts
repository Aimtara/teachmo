import type { NextFunction, Request, Response } from 'express';

// Shared helper for scoping partner/admin routes by tenant.
// We scope by district for now because the partner persistence tables are keyed by district_id.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RequestWithContext = Request & {
  tenant?: {
    organizationId?: string;
    schoolId?: string;
  };
  auth?: {
    userId?: string;
  };
};

export function asUuidOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return UUID_RE.test(v) ? v : null;
}

export function getTenantScope(req: RequestWithContext) {
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

export function requireDistrictScope(req: RequestWithContext, res: Response, next: NextFunction) {
  const { districtId } = getTenantScope(req);
  if (!districtId) {
    return res.status(400).json({ error: 'district scope required (x-district-id)' });
  }
  return next();
}
