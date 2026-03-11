import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import logger from '@/utils/logger';
import { useAuthenticationStatus, useUserData, useAccessToken } from '@nhost/react';
import { fetchUserProfile } from '@/domains/auth';
import { nhost } from '@/lib/nhostClient';
import { GraphQLRequestError } from '@/lib/hasuraErrors';

type TenantState = {
  organizationId: string | null;
  schoolId: string | null;
  loading: boolean;
};

type HasuraClaims = {
  'x-hasura-organization-id'?: string;
  'x-hasura-org-id'?: string;
  'x-hasura-school-id'?: string;
};

type AccessTokenClaims = {
  'https://hasura.io/jwt/claims'?: HasuraClaims;
  'https://nhost.io/jwt/claims'?: HasuraClaims;
  [key: string]: unknown;
};

type UserMetadata = {
  organization_id?: string;
  org_id?: string;
  school_id?: string;
  [key: string]: unknown;
};

const TenantContext = createContext<TenantState>({
  organizationId: null,
  schoolId: null,
  loading: true
});

function decodeToken(token?: string | null): AccessTokenClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload as AccessTokenClaims;
  } catch (err) {
    logger.error('Failed to decode access token', err);
    return null;
  }
}

function resolveTenantClaims(
  user: { metadata?: UserMetadata | null } | null,
  tokenClaims: AccessTokenClaims | null
) {
  const metadata: UserMetadata = user?.metadata ?? {};
  const hasuraClaims: HasuraClaims =
    (tokenClaims && (tokenClaims['https://hasura.io/jwt/claims'] || tokenClaims['https://nhost.io/jwt/claims'])) || {};

  const organizationId =
    metadata.organization_id ||
    metadata.org_id ||
    hasuraClaims['x-hasura-organization-id'] ||
    hasuraClaims['x-hasura-org-id'] ||
    null;
  const schoolId = metadata.school_id || hasuraClaims['x-hasura-school-id'] || null;
  return { organizationId, schoolId };
}

function isUnauthorizedError(err: unknown) {
  if (err instanceof GraphQLRequestError) {
    return err.normalized.kind === 'auth';
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /401|unauthorized|jwt/i.test(message);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const accessToken = useAccessToken();

  const [state, setState] = useState<TenantState>({
    organizationId: null,
    schoolId: null,
    loading: true
  });
  const unauthorizedRecoveryAttemptedRef = useRef(false);

  // Reset the unauthorized recovery guard when the auth session changes
  useEffect(() => {
    unauthorizedRecoveryAttemptedRef.current = false;
  }, [isAuthenticated, user?.id, accessToken]);

  useEffect(() => {
    let mounted = true;

    const resolveTenant = async () => {
      if (isLoading) {
        if (mounted) setState({ organizationId: null, schoolId: null, loading: true });
        return;
      }

      if (!isAuthenticated) {
        if (mounted) setState({ organizationId: null, schoolId: null, loading: false });
        return;
      }

      // Token lag guard: authenticated can flip true before accessToken is available.
      if (!accessToken || !user) {
        if (mounted) setState({ organizationId: null, schoolId: null, loading: true });
        return;
      }

      const claims = decodeToken(accessToken);
      const tenant = resolveTenantClaims(user, claims);

      if (!tenant.organizationId || !tenant.schoolId) {
        try {
          if (!user.id) throw new Error('Missing user id for profile fallback');
          const profile = await fetchUserProfile(user.id);
          if (mounted) {
            setState({
              organizationId: tenant.organizationId ?? profile?.organization_id ?? null,
              schoolId: tenant.schoolId ?? profile?.school_id ?? null,
              loading: false
            });
          }
          return;
        } catch (err) {
          logger.error('Failed profile fallback fetch', err);
          if (mounted) {
            setState({
              organizationId: tenant.organizationId,
              schoolId: tenant.schoolId,
              loading: false
            });
          }

          if (isUnauthorizedError(err)) {
            logger.warn('Profile fallback returned unauthorized; forcing sign-out to clear stale session token.');

            if (!unauthorizedRecoveryAttemptedRef.current) {
              unauthorizedRecoveryAttemptedRef.current = true;
              try {
                await nhost.auth.signOut();
              } catch (signOutError) {
                logger.error('Failed to force sign-out after unauthorized profile fallback.', signOutError);
              }
            }
          }
          return;
        }
      }

      if (mounted) {
        setState({
          organizationId: tenant.organizationId,
          schoolId: tenant.schoolId,
          loading: false
        });
      }
    };

    resolveTenant();

    return () => {
      mounted = false;
    };
  }, [isLoading, isAuthenticated, user, accessToken]);

  const value = useMemo(() => state, [state]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
