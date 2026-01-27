import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import logger from '@/utils/logger';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { nhost } from '@/lib/nhostClient';
import { fetchUserProfile } from '@/domains/auth';

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

/**
 * Decode a JWT token payload. Returns the decoded claims or null if decoding fails.
 * The return type is a dictionary of claims keyed by string.
 */
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

/**
 * Resolve tenant identifiers (organization and school) from the user metadata and JWT claims.
 * Accepts a user object with optional metadata and a dictionary of token claims.
 */
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

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthenticationStatus();
  const user = useUserData();
  const [state, setState] = useState<TenantState>({
    organizationId: null,
    schoolId: null,
    loading: true
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isLoading) return;
      // When no authenticated user, clear tenant info
      if (!user) {
        if (mounted) setState({ organizationId: null, schoolId: null, loading: false });
        return;
      }
      try {
        const token = await nhost.auth.getAccessToken();
        const claims = decodeToken(token);
        const tenant = resolveTenantClaims(user, claims);
        let profileTenant = { organizationId: null, schoolId: null };
        try {
          const profile = await fetchUserProfile(user.id);
          profileTenant = {
            organizationId: profile?.organization_id ?? null,
            schoolId: profile?.school_id ?? null
          };
        } catch (err) {
          logger.error('Failed to fetch user profile for tenant resolution', err);
          profileTenant = { organizationId: null, schoolId: null };
        }
        if (mounted) {
          setState({
            organizationId: profileTenant.organizationId || tenant.organizationId,
            schoolId: profileTenant.schoolId || tenant.schoolId,
            loading: false
          });
        }
      } catch (error) {
        logger.error('TenantProvider encountered an error resolving tenant info', error);
        if (mounted) setState({ organizationId: null, schoolId: null, loading: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isLoading, user]);

  const value = useMemo(() => state, [state.organizationId, state.schoolId, state.loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
