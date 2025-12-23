import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/components/hooks/useStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createPageUrl } from '@/utils';

type Role = 'parent' | 'teacher' | 'school_admin' | 'district_admin' | 'system_admin';

type AdminRoleGuardProps = {
  children: React.ReactNode;
  allowedRoles: Role[];
  permission?: string; // For future ABAC
};

export default function AdminRoleGuard({ children, allowedRoles }: AdminRoleGuardProps) {
  const { user, isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <Navigate to={createPageUrl('Landing')} replace />;
  }

  const userRole = user?.user_type as Role | undefined;

  const hasRequiredRole = Boolean(userRole && allowedRoles.includes(userRole));

  if (!hasRequiredRole) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the required permissions to view this page. Please contact your
            administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
