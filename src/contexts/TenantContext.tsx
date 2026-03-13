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

const TOKEN_LAG_SIGNOUT_DELAY_MS = 4000;

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

async function fetchProfileWithRetry(userId: string, signal?: AbortSignal) {
  const profile = await fetchUserProfile(userId);
  if (profile || signal?.aborted) return profile;

  // Retry once in case the profile row was just created by an auth trigger.
  return fetchUserProfile(userId);
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
  const tokenLagRecoveryAttemptedRef = useRef(false);

  // Reset the unauthorized recovery guard when the auth session changes
  useEffect(() => {
    unauthorizedRecoveryAttemptedRef.current = false;
    tokenLagRecoveryAttemptedRef.current = false;
  }, [isAuthenticated, user?.id, accessToken]);

  useEffect(() => {
    let mounted = true;
    let tokenLagTimer: number | null = null;

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

        if (!accessToken && isAuthenticated && !tokenLagRecoveryAttemptedRef.current) {
          tokenLagTimer = window.setTimeout(async () => {
            if (!mounted || tokenLagRecoveryAttemptedRef.current) return;

            let freshToken: string | null = null;
            try {
              freshToken = await nhost.auth.getAccessToken();
            } catch (accessTokenError) {
              logger.error(
                'Failed to refresh access token during token lag recovery; treating as missing token.',
                accessTokenError
              );
            }

            if (freshToken) return;

            tokenLagRecoveryAttemptedRef.current = true;
            logger.warn('Authenticated state persisted without access token; forcing sign-out to clear stale session.');

            try {
              await nhost.auth.signOut();
            } catch (signOutError) {
              logger.error(
                'Failed to force sign-out after prolonged token lag.',
                signOutError instanceof Error
                  ? { name: signOutError.name, message: signOutError.message }
                  : { message: String(signOutError) }
              );
            }

            if (mounted) {
              setState({ organizationId: null, schoolId: null, loading: false });
            }
          }, TOKEN_LAG_SIGNOUT_DELAY_MS);
        }

        return;
      }

      const claims = decodeToken(accessToken);
      const tenant = resolveTenantClaims(user, claims);

      if (!tenant.organizationId || !tenant.schoolId) {
        try {
          if (!user.id) throw new Error('Missing user id for profile fallback');
          const profile = await fetchProfileWithRetry(user.id);

          if (mounted) {
            setState({
              organizationId: tenant.organizationId ?? profile?.organization_id ?? null,
              schoolId: tenant.schoolId ?? profile?.school_id ?? null,
              loading: false
            });
          }
          return;
        } catch (err) {
          const unauthorized = isUnauthorizedError(err);
          if (unauthorized) {
            logger.warn('Profile fallback fetch returned unauthorized response.');
          } else {
            logger.error('Failed profile fallback fetch', err);
          }
          if (mounted) {
            setState({
              organizationId: tenant.organizationId,
              schoolId: tenant.schoolId,
              loading: false
            });
          }

          if (mounted && unauthorized) {
            logger.warn('Profile fallback returned unauthorized; forcing sign-out to clear stale session token.');

            if (!unauthorizedRecoveryAttemptedRef.current) {
              unauthorizedRecoveryAttemptedRef.current = true;
              try {
                await nhost.auth.signOut();
              } catch (signOutError) {
                logger.error(
                  'Failed to force sign-out after unauthorized profile fallback.',
                  signOutError instanceof Error
                    ? { name: signOutError.name, message: signOutError.message }
                    : { message: String(signOutError) }
                );
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
      if (tokenLagTimer !== null) {
        window.clearTimeout(tokenLagTimer);
      }
    };
  }, [isLoading, isAuthenticated, user, accessToken]);

  const value = useMemo(() => state, [state]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
