import React, { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { usePermissions } from '@/hooks/usePermissions';
import { Page, Card, Button, TextInput, Switch } from '@/components/ui';

// GraphQL queries and mutations for managing enterprise SSO providers.
const LIST_SSO_PROVIDERS = `
  query ListSsoProviders($organizationId: uuid!) {
    enterprise_sso_settings(where: { organization_id: { _eq: $organizationId }}) {
      id
      provider
      client_id
      client_secret
      metadata
      is_enabled
      scim_endpoint
      domain
    }
  }
`;

const UPSERT_SSO_PROVIDER = `
  mutation UpsertSsoProvider($object: enterprise_sso_settings_insert_input!, $id: uuid) {
    insert_enterprise_sso_settings_one(
      object: $object,
      on_conflict: {
        constraint: enterprise_sso_settings_pkey,
        update_columns: [client_id, client_secret, metadata, is_enabled, scim_endpoint, domain]
      }
    ) {
      id
    }
  }
`;

/**
 * AdminSSOProviders
 * Admin page for configuring SAML/OIDC SSO providers.
 * Allows listing existing providers, enabling/disabling them, and editing provider metadata.
 */
export default function AdminSSOProviders() {
  const { hasPermission } = usePermissions();
  // Replace this with actual context or prop for organization ID.
  const organizationId = (globalThis as any).__teachmoOrgId ?? null;
  const [editingProvider, setEditingProvider] = useState<null | string>(null);
  const [form, setForm] = useState<any>({});

  const [{ data, fetching, error }, refetch] = useQuery({
    query: LIST_SSO_PROVIDERS,
    variables: { organizationId },
    pause: !organizationId,
  });

  const [, upsert] = useMutation(UPSERT_SSO_PROVIDER);

  if (!hasPermission('manage_sso_providers')) {
    return (
      <Page title="SSO Providers">
        <p>You do not have permission to manage SSO providers.</p>
      </Page>
    );
  }

  if (fetching) {
    return (
      <Page title="SSO Providers">
        <p>Loading...</p>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="SSO Providers">
        <p>Error loading providers: {error.message}</p>
      </Page>
    );
  }

  const providers = data?.enterprise_sso_settings ?? [];

  const startEdit = (provider: any) => {
    setEditingProvider(provider?.id || 'new');
    setForm({
      id: provider?.id,
      provider: provider?.provider || '',
      client_id: provider?.client_id || '',
      client_secret: provider?.client_secret || '',
      metadata: provider?.metadata || '',
      is_enabled: provider?.is_enabled ?? false,
      scim_endpoint: provider?.scim_endpoint || '',
      domain: provider?.domain || '',
    });
  };

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const { id, ...rest } = form;
    const object = {
      ...rest,
      id: id || undefined,
      organization_id: organizationId,
    };
    await upsert({ object, id: id || undefined });
    setEditingProvider(null);
    refetch({ requestPolicy: 'network-only' });
  };

  return (
    <Page title="SSO Providers">
      <p>Configure your SAML / OIDC single sign-on providers for this organization.</p>
      <div className="space-y-4">
        {providers.map((provider: any) => (
          <Card key={provider.id} className="p-4 flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">{provider.provider}</h3>
              <p className="text-sm">Domain: {provider.domain || '—'}</p>
              <p className="text-sm">SCIM Endpoint: {provider.scim_endpoint || '—'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={provider.is_enabled}
                onChange={(checked: boolean) => {
                  startEdit({ ...provider, is_enabled: checked });
                  handleSave();
                }}
                aria-label="Enable provider"
              />
              <Button onClick={() => startEdit(provider)}>Edit</Button>
            </div>
          </Card>
        ))}
        <Button onClick={() => startEdit(null)}>Add Provider</Button>
      </div>
      {editingProvider !== null && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <Card className="p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? 'Edit Provider' : 'Add Provider'}
            </h3>
            <div className="space-y-2">
              <TextInput
                label="Provider (e.g., Okta, Azure AD, Google Workspace)"
                value={form.provider}
                onChange={(e: any) => handleChange('provider', e.target.value)}
              />
              <TextInput
                label="Client ID"
                value={form.client_id}
                onChange={(e: any) => handleChange('client_id', e.target.value)}
              />
              <TextInput
                label="Client Secret"
                value={form.client_secret}
                onChange={(e: any) => handleChange('client_secret', e.target.value)}
                type="password"
              />
              <TextInput
                label="Metadata / Issuer URL"
                value={form.metadata}
                onChange={(e: any) => handleChange('metadata', e.target.value)}
              />
              <TextInput
                label="SCIM Endpoint"
                value={form.scim_endpoint}
                onChange={(e: any) => handleChange('scim_endpoint', e.target.value)}
              />
              <TextInput
                label="Domain"
                value={form.domain}
                onChange={(e: any) => handleChange('domain', e.target.value)}
              />
              <div className="flex items-center">
                <Switch
                  checked={form.is_enabled}
                  onChange={(checked: boolean) => handleChange('is_enabled', checked)}
                  aria-label="Enable provider"
                />
                <span className="ml-2">Enabled</span>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="secondary" onClick={() => setEditingProvider(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
