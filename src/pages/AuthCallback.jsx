import { useEffect, useRef } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';
import {
  getSavedOnboardingFlowPreference,
  normalizeOnboardingFlow,
  resolveOnboardingPath,
  saveOnboardingFlowPreference,
} from '@/lib/onboardingFlow';
import { logAnalyticsEvent } from '@/observability/telemetry';

export default function AuthCallback() {
  const { isAuthenticated, isLoading, error } = useAuthenticationStatus();
  const user = useUserData();
  const { role, roleSource, loading: roleLoading, needsOnboarding, tenantScope } = useUserRoleState();
  const [searchParams] = useSearchParams();
  const flowFromQuery = searchParams.get('flow');
  const preferredFlow = normalizeOnboardingFlow(flowFromQuery ?? getSavedOnboardingFlowPreference());
  const loggedRef = useRef(false);


  useEffect(() => {
    saveOnboardingFlowPreference(preferredFlow);
  }, [preferredFlow]);

  useEffect(() => {
    if (loggedRef.current) return;
    if (!isAuthenticated || isLoading || roleLoading || !user?.id) return;

    // Best-effort: we may not have tenant claims yet if the user still needs onboarding.
    loggedRef.current = true;
    logAnalyticsEvent(
      {
        organizationId: tenantScope?.organizationId ?? undefined,
        schoolId: tenantScope?.schoolId ?? undefined
      },
      { eventName: 'auth_login', actorId: user.id, actorRole: role || undefined }
    ).catch(() => {});
  }, [isAuthenticated, isLoading, roleLoading, tenantScope?.organizationId, tenantScope?.schoolId, user?.id, role]);

  if (!isLoading && !isAuthenticated) {
    const params = new URLSearchParams();
    params.set('flow', preferredFlow);
    const fallbackErrorCode = error ? 'auth_error' : 'unauthenticated';
    if (error) {
      // Prefer structured error information when available, and only use
      // "session_expired" when the message clearly indicates an expired session.
      const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
      const looksLikeSessionExpired =
        message.includes('session') && message.includes('expired');
      const structuredCode =
        (typeof error.code === 'string' && error.code) ||
        (typeof error.error === 'string' && error.error) ||
        (typeof error.name === 'string' && error.name) ||
        null;
      const errorCode = looksLikeSessionExpired
        ? 'session_expired'
        : structuredCode || fallbackErrorCode;
      params.set('error', errorCode);
    } else {
      params.set('error', fallbackErrorCode);
    }
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  if (isAuthenticated && !isLoading && !roleLoading) {
    if (needsOnboarding) {
      return (
        <Navigate
          to={resolveOnboardingPath({
            role: roleSource === 'unknown' ? null : role,
            preferredFlow,
          })}
          replace
        />
      );
    }
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
