import { graphqlRequest } from '@/lib/graphql';

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

type TenantSsoResponse = {
  enterprise_sso_settings?: Array<{ provider?: string | null }>;
  tenant_settings?: Array<{ settings?: Record<string, unknown> | null }>;
};

export type TenantSsoSettings = {
  providers: string[];
  requireSso: boolean;
};

function normalizeSettings(res: TenantSsoResponse): TenantSsoSettings {
  const providers = res?.enterprise_sso_settings?.map((row) => row.provider).filter(Boolean) as string[] ?? [];

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

export async function getTenantSsoSettings(organizationId: string): Promise<TenantSsoSettings> {
  try {
    const res = await graphqlRequest<TenantSsoResponse>(TENANT_SSO_SETTINGS_QUERY, { organizationId });
    return normalizeSettings(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const legacyFieldMissing = message.includes('field "organization_id"') || message.includes("field 'organization_id'");

    if (!legacyFieldMissing) {
      throw error;
    }

    const legacyRes = await graphqlRequest<TenantSsoResponse>(TENANT_SSO_SETTINGS_LEGACY_QUERY, { organizationId });
    return normalizeSettings(legacyRes);
  }
}
