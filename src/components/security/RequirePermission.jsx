import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { can } from '@/security/permissions';
import { createPageUrl } from '@/utils';

export default function RequirePermission({ action, children }) {
  const role = useUserRole();

  if (!can(role, action)) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return children;
}
