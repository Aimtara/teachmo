import { useEffect } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';
import { nhost } from '@/lib/nhostClient';

export default function AuthCallback() {
  const { isAuthenticated, isLoading, error } = useAuthenticationStatus();
  const role = useUserRole();

  useEffect(() => {
    nhost.auth.refreshSession();
  }, []);

  if (isAuthenticated) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-gray-900">Completing sign-in…</p>
        {isLoading && <p className="text-gray-600">We are finalizing your Nhost session.</p>}
        {error && <p className="text-red-600">{error.message}</p>}
      </div>
    </div>
  );
}
