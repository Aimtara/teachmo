import React from 'react';
import PropTypes from 'prop-types';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { useTenantFeatureFlags } from '@/hooks/useTenantFeatureFlags';

const AUTH_USER_HYDRATION_TIMEOUT_MS = 4000;


export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const authUser = useUserData();
  const [hydrationTimedOut, setHydrationTimedOut] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  useTenantFeatureFlags();

  React.useEffect(() => {
    setHydrationTimedOut(false);

    if (isLoading || !isAuthenticated || authUser) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHydrationTimedOut(true);
    }, AUTH_USER_HYDRATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, isAuthenticated, authUser, retryNonce]);

  const status = hydrationTimedOut
    ? 'error'
    : (isLoading || (isAuthenticated && !authUser))
      ? 'loading'
      : isAuthenticated
        ? 'authenticated'
        : 'unauthorized';

  const user = React.useMemo(() => {
    if (!isAuthenticated || !authUser) return null;

    return {
      id: authUser.id,
      user_id: authUser.id,
      email: authUser.email,
      full_name: authUser.displayName || authUser.metadata?.full_name || '',
      app_role:
        authUser.defaultRole ||
        authUser.metadata?.app_role ||
        authUser.metadata?.preferred_active_role ||
        (Array.isArray(authUser.roles) && authUser.roles.length ? authUser.roles[0] : null),
      organization_id: authUser.metadata?.organization_id || authUser.metadata?.org_id || null,
      school_id: authUser.metadata?.school_id || null,
      roles: Array.isArray(authUser.roles) ? authUser.roles : [],
      metadata: authUser.metadata || {},
      defaultRole: authUser.defaultRole ?? null,
    };
  }, [isAuthenticated, authUser]);

  const refresh = React.useCallback(() => {
    setHydrationTimedOut(false);
    setRetryNonce((n) => n + 1);
  }, []);

  const error = hydrationTimedOut ? new Error('Session hydrated without user identity. Please sign in again.') : null;

  return { user, status, error, refresh };
}

export function AuthGuardState({ status, error, onRetry }) {
  if (status === 'loading') {
    return (
      <div className="p-6 text-center text-gray-600" role="status">
        Checking your session...
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded" role="alert">
        <p className="font-semibold text-amber-800">Your session has expired</p>
        <p className="text-amber-700">Please sign in again to continue.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded" role="alert">
        <p className="font-semibold text-red-800">We hit a connection issue</p>
        {error ? <p className="text-red-700 mb-3">{String(error?.message || error)}</p> : null}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white rounded"
          style={{ backgroundColor: 'var(--teachmo-sage)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}

AuthGuardState.propTypes = {
  status: PropTypes.string.isRequired,
  error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  onRetry: PropTypes.func,
};

AuthGuardState.defaultProps = {
  error: null,
  onRetry: undefined,
};
