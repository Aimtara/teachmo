import { useContext, useMemo } from 'react';
import { AuthContext } from '@nhost/react';
import { rbacPolicy, Permission } from '@/config/rbacPolicy';

/**
 * usePermissions hook
 * Returns a helper to check whether the current user has permission for a given action.
 *
 * Usage:
 * const { hasPermission } = usePermissions();
 * if (hasPermission('manage_sso_providers')) { ... }
 */
export function usePermissions() {
  const { user } = useContext(AuthContext);
  const roles: string[] = (user as any)?.roles || [];

  /**
   * Check if the current user has permission.
   * Accepts a permission key or array of keys and returns true if any match.
   */
  const hasPermission = useMemo(() => {
    return (keys: Permission | Permission[]) => {
      const perms = Array.isArray(keys) ? keys : [keys];
      // accumulate allowed actions for all roles
      const allowed: Set<Permission> = new Set();
      roles.forEach((role: string) => {
        const actions = (rbacPolicy as any)[role]?.actions || [];
        actions.forEach((action: Permission) => allowed.add(action));
      });
      return perms.some((p) => allowed.has(p));
    };
  }, [roles]);

  return { hasPermission };
}
