import { getDefaultPathForRole, normalizeRole } from '@/config/rbac';

export function navigateToDashboard(user, navigate) {
  if (typeof navigate !== 'function') return;

  const role = normalizeRole(
    user?.preferred_active_role || user?.role || user?.metadata?.role || user?.defaultRole
  );

  const destination = getDefaultPathForRole(role) || '/dashboard';
  navigate(user ? destination : '/login', { replace: true });
}

export default {
  navigateToDashboard
};
