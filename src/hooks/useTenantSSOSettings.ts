import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';

const TENANT_SSO_SETTINGS_QUERY = /* GraphQL */ `
  query TenantSSOSettings($organizationId: uuid!) {
    enterprise_sso_settings(where: { organization_id: { _eq: $organizationId }, is_enabled: { _eq: true } }) {
      provider
    }
    tenant_settings(where: { organization_id: { _eq: $organizationId }, school_id: { _is_null: true } }, limit: 1) {
      settings
    }
  }
`;

const TENANT_SSO_SETTINGS_LEGACY_QUERY = /* GraphQL */ `
  query TenantSSOSettingsLegacy($organizationId: uuid!) {
    enterprise_sso_settings(where: { organization_id: { _eq: $organizationId }, is_enabled: { _eq: true } }) {
      provider
    }
    tenant_settings(where: { district_id: { _eq: $organizationId }, school_id: { _is_null: true } }, limit: 1) {
      settings
    }
  }
`;

function normalizeSettings(res: any) {
  const providers: string[] = res?.enterprise_sso_settings?.map((row: any) => row.provider).filter(Boolean) ?? [];

  let requireSso = false;
  const settings = res?.tenant_settings?.[0]?.settings ?? {};

  if (settings) {
    if (typeof settings.require_sso === 'boolean') {
      requireSso = settings.require_sso;
    } else if (typeof settings.requireSso === 'boolean') {
      requireSso = settings.requireSso;
    }
  }

  return { providers, requireSso };
}

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
    queryFn: async () => {
      try {
        const res = await graphqlRequest(TENANT_SSO_SETTINGS_QUERY, { organizationId });
        return normalizeSettings(res);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? '');
        const legacyFieldMissing = message.includes('field "organization_id"') || message.includes("field 'organization_id'");

        if (!legacyFieldMissing) {
          throw error;
        }

        const legacyRes = await graphqlRequest(TENANT_SSO_SETTINGS_LEGACY_QUERY, { organizationId });
        return normalizeSettings(legacyRes);
      }
    },
  });
}

export default useTenantSSOSettings;
