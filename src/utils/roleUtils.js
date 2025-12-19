/**
 * Role utility functions
 * Shared utilities for deriving and normalizing user roles
 */

/**
 * Derives the effective role from a user object
 * Checks multiple possible sources in priority order
 * @param {Object} user - The user object
 * @returns {string} The derived role, defaulting to "parent"
 */
export function deriveRole(user) {
  const direct = user?.preferred_active_role || user?.role;
  if (direct) return direct;

  const metaRole = user?.metadata?.role || user?.user_metadata?.role;
  if (metaRole) return metaRole;

  if (Array.isArray(user?.roles) && user.roles.length) return user.roles[0];
  return "parent";
}

export default {
  deriveRole
};
