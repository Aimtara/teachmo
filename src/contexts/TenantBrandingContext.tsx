import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { useTenant } from './TenantContext';

type Branding = Record<string, string>;

type TenantBrandingState = {
  branding: Branding;
  loading: boolean;
};

const TenantBrandingContext = createContext<TenantBrandingState>({ branding: {}, loading: true });

function applyBranding(branding: Branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root) return;
  if (branding.primary) root.style.setProperty('--tm-primary', branding.primary);
  if (branding.accent) root.style.setProperty('--tm-accent', branding.accent);
  if (branding.background) root.style.setProperty('--tm-background', branding.background);
  if (branding.foreground) root.style.setProperty('--tm-foreground', branding.foreground);
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const [state, setState] = useState<TenantBrandingState>({ branding: {}, loading: true });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (tenant.loading || !tenant.organizationId) {
        if (mounted) setState({ branding: {}, loading: tenant.loading });
        return;
      }
      try {
        const token = await nhost.auth.getAccessToken();
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (token) headers.authorization = `Bearer ${token}`;
        headers['x-teachmo-org-id'] = tenant.organizationId;
        if (tenant.schoolId) headers['x-teachmo-school-id'] = tenant.schoolId;

        const res = await fetch(`${getApiBaseUrl()}/tenants/settings`, { headers });
        const json = await res.json();
        const branding = json?.settings?.branding || {};
        if (mounted) {
          setState({ branding, loading: false });
          applyBranding(branding);
        }
      } catch (err) {
        if (mounted) setState({ branding: {}, loading: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tenant.organizationId, tenant.schoolId, tenant.loading]);

  const value = useMemo(() => state, [state.branding, state.loading]);

  return <TenantBrandingContext.Provider value={value}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}
