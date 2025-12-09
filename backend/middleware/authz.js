/* eslint-env node */
// Lightweight authorization helpers to enforce scoped access rules.

export const injectUserContext = (req, _res, next) => {
  const role = (req.header('x-user-role') || '').toLowerCase();
  const familyId = req.header('x-family-id');
  const classIds = (req.header('x-class-ids') || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const partnerId = req.header('x-partner-id');
  const consentGranted = (req.header('x-partner-consent') || '').toLowerCase() === 'true';

  req.user = {
    id: req.header('x-user-id') || 'anonymous',
    role,
    familyId,
    classIds,
    partnerId,
    consentGranted,
  };
  next();
};

const forbid = (res, message) => res.status(403).json({ error: message });

export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return forbid(res, 'not authorized for this role');
  }
  return next();
};

export const enforceFamilyAccess = (req, res, next) => {
  const { user } = req;
  const { familyId } = req.params;

  if (user.role === 'parent') {
    if (user.familyId !== familyId) {
      return forbid(res, 'parents can only view their own family data');
    }
  } else if (user.role === 'teacher' || user.role === 'partner') {
    return forbid(res, 'family-level data is restricted to the owning family');
  }

  return next();
};

export const enforceClassAccess = (req, res, next) => {
  const { user } = req;
  const { classId } = req.params;

  if (user.role === 'teacher') {
    if (!user.classIds.includes(classId)) {
      return forbid(res, 'teachers can only access their own classes');
    }
  } else if (user.role === 'parent') {
    const allowedClasses = req.allowedParentClassIds || [];
    if (!allowedClasses.includes(classId)) {
      return forbid(res, 'parents can only view classes tied to their children');
    }
  } else if (user.role === 'partner') {
    return forbid(res, 'partners cannot access class-level detail');
  }

  return next();
};

export const enforcePartnerAggregation = (req, res, next) => {
  const { user } = req;
  if (user.role !== 'partner') {
    return forbid(res, 'partners only endpoint');
  }

  req.shouldProvideDetail = user.consentGranted === true;
  return next();
};
