import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PROVIDERS = [
  { id: 'google', label: 'Google Workspace' },
  { id: 'azuread', label: 'Azure AD' },
  { id: 'clever', label: 'Clever' },
  { id: 'classlink', label: 'ClassLink' },
  { id: 'okta', label: 'Okta' },
  { id: 'saml', label: 'SAML' }
];

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export default function AdminSSOSettings() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;

  const domainsQuery = useQuery({
    queryKey: ['tenant-domains', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query TenantDomains($organizationId: uuid!) {
        tenant_domains(where: { organization_id: { _eq: $organizationId } }, order_by: { domain: asc }) {
          id
          domain
          is_primary
          verified_at
        }
      }`;
      const res = await graphql(query, { organizationId });
      return res?.tenant_domains ?? [];
    }
  });

  const ssoQuery = useQuery({
    queryKey: ['enterprise-sso-settings', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query EnterpriseSsoSettings($organizationId: uuid!) {
        enterprise_sso_settings(where: { organization_id: { _eq: $organizationId } }, order_by: { provider: asc }) {
          id
          provider
          client_id
          client_secret
          issuer
          metadata
          is_enabled
        }
      }`;
      const res = await graphql(query, { organizationId });
      return res?.enterprise_sso_settings ?? [];
    }
  });

  const [newDomain, setNewDomain] = useState('');
  const [providerState, setProviderState] = useState({});

  useEffect(() => {
    const initial = {};
    PROVIDERS.forEach((provider) => {
      const existing = ssoQuery.data?.find((row) => row.provider === provider.id);
      initial[provider.id] = {
        id: existing?.id ?? null,
        provider: provider.id,
        client_id: existing?.client_id ?? '',
        client_secret: existing?.client_secret ?? '',
        issuer: existing?.issuer ?? '',
        metadata: JSON.stringify(existing?.metadata ?? {}, null, 2),
        is_enabled: Boolean(existing?.is_enabled)
      };
    });
    setProviderState(initial);
  }, [ssoQuery.data]);

  const updateProvider = (providerId, changes) => {
    setProviderState((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        ...changes
      }
    }));
  };

  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Missing organization scope');
      const mutation = `mutation InsertDomain($object: tenant_domains_insert_input!) {
        insert_tenant_domains_one(object: $object) { id }
      }`;
      await graphql(mutation, {
        object: {
          organization_id: organizationId,
          domain: newDomain.trim().toLowerCase(),
          is_primary: false
        }
      });
    },
    onSuccess: () => {
      setNewDomain('');
      domainsQuery.refetch();
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async ({ id }) => {
      const mutation = `mutation SetPrimary($organizationId: uuid!, $id: uuid!) {
        update_tenant_domains(where: { organization_id: { _eq: $organizationId } }, _set: { is_primary: false }) {
          affected_rows
        }
        update_tenant_domains_by_pk(pk_columns: { id: $id }, _set: { is_primary: true }) { id }
      }`;
      await graphql(mutation, { organizationId, id });
    },
    onSuccess: () => domainsQuery.refetch()
  });

  const removeDomainMutation = useMutation({
    mutationFn: async ({ id }) => {
      const mutation = `mutation DeleteDomain($id: uuid!) {
        delete_tenant_domains_by_pk(id: $id) { id }
      }`;
      await graphql(mutation, { id });
    },
    onSuccess: () => domainsQuery.refetch()
  });

  const saveProviderMutation = useMutation({
    mutationFn: async ({ providerId }) => {
      if (!organizationId) throw new Error('Missing organization scope');
      const config = providerState[providerId];
      const mutation = `mutation UpsertSso($object: enterprise_sso_settings_insert_input!) {
        insert_enterprise_sso_settings_one(
          object: $object,
          on_conflict: {
            constraint: enterprise_sso_settings_organization_id_provider_key,
            update_columns: [client_id, client_secret, issuer, metadata, is_enabled]
          }
        ) { id }
      }`;
      await graphql(mutation, {
        object: {
          organization_id: organizationId,
          provider: providerId,
          client_id: config.client_id || null,
          client_secret: config.client_secret || null,
          issuer: config.issuer || null,
          metadata: safeJsonParse(config.metadata),
          is_enabled: Boolean(config.is_enabled)
        }
      });
    },
    onSuccess: () => ssoQuery.refetch()
  });

  const domainRows = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SSO Policy</h1>
        <p className="text-sm text-muted-foreground">
          Manage tenant domains and configure enterprise SSO providers for your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              placeholder="district.edu"
              className="md:max-w-sm"
            />
            <Button
              onClick={() => addDomainMutation.mutate()}
              disabled={!newDomain.trim() || addDomainMutation.isLoading || !organizationId}
            >
              Add domain
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domainRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No tenant domains configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                domainRows.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-mono text-xs">{domain.domain}</TableCell>
                    <TableCell>{domain.verified_at ? 'Verified' : 'Pending'}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={domain.is_primary}
                        onCheckedChange={() => setPrimaryMutation.mutate({ id: domain.id })}
                        aria-label={`Set ${domain.domain} primary`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDomainMutation.mutate({ id: domain.id })}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SSO Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {PROVIDERS.map((provider) => {
            const config = providerState[provider.id] ?? {};
            return (
              <div key={provider.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{provider.label}</div>
                    <div className="text-xs text-muted-foreground">Provider key: {provider.id}</div>
                  </div>
                  <Checkbox
                    checked={Boolean(config.is_enabled)}
                    onCheckedChange={(checked) => updateProvider(provider.id, { is_enabled: checked })}
                    aria-label={`Enable ${provider.label}`}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={config.client_id ?? ''}
                    onChange={(event) => updateProvider(provider.id, { client_id: event.target.value })}
                    placeholder="Client ID"
                  />
                  <Input
                    value={config.client_secret ?? ''}
                    onChange={(event) => updateProvider(provider.id, { client_secret: event.target.value })}
                    placeholder="Client Secret"
                    type="password"
                  />
                  <Input
                    value={config.issuer ?? ''}
                    onChange={(event) => updateProvider(provider.id, { issuer: event.target.value })}
                    placeholder="Issuer / Metadata URL"
                  />
                </div>
                <Textarea
                  value={config.metadata ?? ''}
                  onChange={(event) => updateProvider(provider.id, { metadata: event.target.value })}
                  rows={4}
                  placeholder='{"scopes": ["openid", "profile"]}'
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveProviderMutation.mutate({ providerId: provider.id })}
                    disabled={saveProviderMutation.isLoading || !organizationId}
                  >
                    {saveProviderMutation.isLoading ? 'Saving…' : 'Save provider'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
