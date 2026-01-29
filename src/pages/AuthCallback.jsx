import { useEffect, useRef } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';
import { nhost } from '@/lib/nhostClient';
import { useTenant } from '@/contexts/TenantContext';
import { logAnalyticsEvent } from '@/observability/telemetry';

export default function AuthCallback() {
  const { isAuthenticated, isLoading, error } = useAuthenticationStatus();
  const user = useUserData();
  const tenant = useTenant();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();
  const loggedRef = useRef(false);

  useEffect(() => {
    nhost.auth.refreshSession();
  }, []);

  useEffect(() => {
    if (loggedRef.current) return;
    if (!isAuthenticated || isLoading || roleLoading || !user?.id) return;

    // Best-effort: we may not have tenant claims yet if the user still needs onboarding.
    loggedRef.current = true;
    logAnalyticsEvent(
      { organizationId: tenant.organizationId ?? undefined, schoolId: tenant.schoolId ?? undefined },
      { eventName: 'auth_login', actorId: user.id, actorRole: role || undefined }
    ).catch(() => {});
  }, [isAuthenticated, isLoading, roleLoading, tenant.organizationId, tenant.schoolId, user?.id, role]);

  if (isAuthenticated && !isLoading && !roleLoading) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
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
