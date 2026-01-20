/* eslint-env node */

export function getHasuraRole(req) {
  return (
    req.headers['x-hasura-role'] ||
    req.headers['x-nhost-role'] ||
    req.headers['x-user-role'] ||
    null
  );
}

export function assertAdminRole(req) {
  const role = getHasuraRole(req);
  const allowed = new Set(['system_admin', 'school_admin', 'district_admin']);
  if (!role || !allowed.has(String(role))) {
    const err = new Error('Forbidden');
    // @ts-ignore
    err.statusCode = 403;
    throw err;
  }
  return role;
}
