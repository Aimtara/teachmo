import { useQuery } from '@tanstack/react-query';
import { getTenantSsoSettings } from '@/domains/tenant/ssoSettings';
import { useTenantScope } from '@/hooks/useTenantScope';

/**
 * useTenantSSOSettings fetches the enabled SSO providers and the requireSso flag
 * for the current tenant (organization). It first queries `tenant_settings.organization_id`
 * and falls back to legacy `district_id` shape if present in older schemas.
 */
export function useTenantSSOSettings() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? scope?.districtId ?? null;

  return useQuery({
    queryKey: ['tenant-sso-settings', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => getTenantSsoSettings(organizationId),
  });
}

export default useTenantSSOSettings;
