import { useMemo } from 'react';
import { useUserData } from '@nhost/react';

const ROLE_MAP = {
  teacher: '/teacher/dashboard',
  admin: '/admin/analytics',
  school_admin: '/admin/analytics',
  district_admin: '/admin/analytics'
};

export function useUserRole() {
  const user = useUserData();

  return useMemo(() => {
    const claimedRole = user?.metadata?.role || user?.defaultRole;
    if (claimedRole === 'teacher') return 'teacher';
    if (claimedRole === 'system_admin' || claimedRole === 'admin') return 'system_admin';
    if (claimedRole === 'school_admin') return 'school_admin';
    if (claimedRole === 'district_admin') return 'district_admin';
    return 'parent';
  }, [user]);
}

export function getDefaultPathForRole(role) {
  if (!role) return '/dashboard';
  return ROLE_MAP[role] || '/dashboard';
}
