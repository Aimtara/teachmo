import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import logger from '@/utils/logger';
import { useAuthenticationStatus, useUserData, useAccessToken } from '@nhost/react';

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

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const accessToken = useAccessToken();

  const [state, setState] = useState<TenantState>({
    organizationId: null,
    schoolId: null,
    loading: true
  });

  useEffect(() => {
    if (isLoading) {
      setState({ organizationId: null, schoolId: null, loading: true });
      return;
    }

    if (!isAuthenticated) {
      setState({ organizationId: null, schoolId: null, loading: false });
      return;
    }

    // Token lag guard: authenticated can flip true before accessToken is available.
    if (!accessToken || !user) {
      setState({ organizationId: null, schoolId: null, loading: true });
      return;
    }

    const claims = decodeToken(accessToken);
    const tenant = resolveTenantClaims(user, claims);
    setState({
      organizationId: tenant.organizationId,
      schoolId: tenant.schoolId,
      loading: false
    });
  }, [isLoading, isAuthenticated, user, accessToken]);

  const value = useMemo(() => state, [state.organizationId, state.schoolId, state.loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
