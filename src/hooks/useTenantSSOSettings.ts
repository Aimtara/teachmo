import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';

/**
 * useTenantSSOSettings fetches the enabled SSO providers and the requireSso flag
 * for the current tenant (organization).  It reads enterprise_sso_settings rows
 * scoped to the tenant where is_enabled = true and looks for a require_sso flag
 * stored inside tenant_settings.settings.  The hook returns { providers, requireSso }.
 */
export function useTenantSSOSettings() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? scope?.districtId ?? null;

  return useQuery({
    queryKey: ['tenant-sso-settings', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = /* GraphQL */ `
        query TenantSSOSettings($organizationId: uuid!) {
          enterprise_sso_settings(where: { organization_id: { _eq: $organizationId }, is_enabled: { _eq: true } }) {
            provider
          }
          tenant_settings(where: { district_id: { _eq: $organizationId }, school_id: { _is_null: true } }, limit: 1) {
            settings
          }
        }
      `;
      const res = await graphqlRequest(query, { organizationId });
      // Build list of enabled provider IDs
      const providers: string[] =
        res?.enterprise_sso_settings?.map((row: any) => row.provider).filter(Boolean) ?? [];
      // Extract require_sso flag from settings JSON
      let requireSso = false;
      const settings =
        res?.tenant_settings?.[0]?.settings ??
        {};
      if (settings) {
        // Accept camelCase or snake_case flags
        if (typeof settings.require_sso === 'boolean') {
          requireSso = settings.require_sso;
        } else if (typeof settings.requireSso === 'boolean') {
          requireSso = settings.requireSso;
        }
      }
      return { providers, requireSso };
    },
  });
}

export default useTenantSSOSettings;
