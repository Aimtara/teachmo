import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';
import { getSavedOnboardingFlowPreference, resolveOnboardingPath } from '@/lib/onboardingFlow';

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (isLoading || roleLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (needsOnboarding) {
    return (
      <Navigate
        to={resolveOnboardingPath({ role, preferredFlow: getSavedOnboardingFlowPreference() })}
        replace
      />
    );
  }

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}
