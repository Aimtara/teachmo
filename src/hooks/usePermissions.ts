import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
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
  const role = useUserRole();

  /**
   * Check if the current user has permission.
   * Accepts a permission key or array of keys and returns true if any match.
   */
  const hasPermission = useMemo(() => {
    return (keys: Permission | Permission[]) => {
      const perms = Array.isArray(keys) ? keys : [keys];
      if (!role) return false;
      const actions = rbacPolicy[role]?.actions ?? [];
      return perms.some((permission) => actions.includes(permission));
    };
  }, [role]);

  return { hasPermission };
}
