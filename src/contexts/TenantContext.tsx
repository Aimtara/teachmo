import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { nhost } from '@/lib/nhostClient';
import { fetchUserProfile } from '@/domains/auth';

type TenantState = {
  organizationId: string | null;
  schoolId: string | null;
  loading: boolean;
};

const TenantContext = createContext<TenantState>({
  organizationId: null,
  schoolId: null,
  loading: true
});

function decodeToken(token?: string | null) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (err) {
    return null;
  }
}

function resolveTenantClaims(user: any, tokenClaims: any) {
  const metadata = user?.metadata || {};
  const hasuraClaims =
    tokenClaims?.['https://hasura.io/jwt/claims'] ||
    tokenClaims?.['https://nhost.io/jwt/claims'] ||
    {};

  const organizationId =
    metadata.organization_id ||
    metadata.org_id ||
    hasuraClaims['x-hasura-organization-id'] ||
    hasuraClaims['x-hasura-org-id'] ||
    null;
  const schoolId =
    metadata.school_id ||
    hasuraClaims['x-hasura-school-id'] ||
    null;

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
      if (!user) {
        if (mounted) setState({ organizationId: null, schoolId: null, loading: false });
        return;
      }
      const token = await nhost.auth.getAccessToken();
      const claims = decodeToken(token);
      const tenant = resolveTenantClaims(user, claims);
      let profileTenant = { organizationId: null, schoolId: null };
      try {
        const profile = await fetchUserProfile(user.id);
        profileTenant = {
          organizationId: profile?.organization_id || null,
          schoolId: profile?.school_id || null
        };
      } catch (err) {
        profileTenant = { organizationId: null, schoolId: null };
      }
      if (mounted) {
        setState({
          organizationId: profileTenant.organizationId || tenant.organizationId,
          schoolId: profileTenant.schoolId || tenant.schoolId,
          loading: false
        });
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
