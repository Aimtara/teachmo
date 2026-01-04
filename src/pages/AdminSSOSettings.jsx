import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PROVIDERS = [
  { id: 'google', label: 'Google Workspace' },
  { id: 'azure_ad', label: 'Azure AD' },
  { id: 'clever', label: 'Clever' },
  { id: 'classlink', label: 'ClassLink' }
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
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;

  const ssoQuery = useQuery({
    queryKey: ['tenant_sso_settings', districtId, schoolId],
    enabled: Boolean(districtId),
    queryFn: async () => {
      const query = `query TenantSsoSettings($districtId: uuid!, $schoolId: uuid) {
        tenant_sso_settings(
          where: {
            district_id: { _eq: $districtId },
            _or: [
              { school_id: { _eq: $schoolId } },
              { school_id: { _is_null: true } }
            ]
          },
          order_by: { school_id: desc_nulls_last },
          limit: 1
        ) {
          id
          allowed_providers
          allowed_domains
          require_sso
          enforcement_mode
          metadata
          updated_at
        }
      }`;

      const res = await graphql(query, { districtId, schoolId });
      return res?.tenant_sso_settings?.[0] ?? null;
    },
  });

  const [selectedProviders, setSelectedProviders] = useState([]);
  const [domains, setDomains] = useState('');
  const [requireSso, setRequireSso] = useState(false);
  const [enforcementMode, setEnforcementMode] = useState('optional');
  const [notes, setNotes] = useState('');

  useMemo(() => {
    const row = ssoQuery.data;
    if (!row) return;
    setSelectedProviders(row.allowed_providers ?? []);
    setDomains((row.allowed_domains ?? []).join('\n'));
    setRequireSso(Boolean(row.require_sso));
    setEnforcementMode(row.enforcement_mode ?? 'optional');
    setNotes(JSON.stringify(row.metadata ?? {}, null, 2));
  }, [ssoQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!districtId) throw new Error('Missing district scope');

      const allowedDomains = domains
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);
      const metadata = safeJsonParse(notes);

      if (ssoQuery.data?.id) {
        const mutation = `mutation UpdateSso($id: uuid!, $changes: tenant_sso_settings_set_input!) {
          update_tenant_sso_settings_by_pk(pk_columns: { id: $id }, _set: $changes) { id updated_at }
        }`;

        await graphql(mutation, {
          id: ssoQuery.data.id,
          changes: {
            allowed_providers: selectedProviders,
            allowed_domains: allowedDomains,
            require_sso: requireSso,
            enforcement_mode: enforcementMode,
            metadata,
          }
        });
      } else {
        const mutation = `mutation InsertSso($object: tenant_sso_settings_insert_input!) {
          insert_tenant_sso_settings_one(object: $object) { id }
        }`;

        await graphql(mutation, {
          object: {
            district_id: districtId,
            school_id: schoolId,
            allowed_providers: selectedProviders,
            allowed_domains: allowedDomains,
            require_sso: requireSso,
            enforcement_mode: enforcementMode,
            metadata,
          }
        });
      }
    },
    onSuccess: () => ssoQuery.refetch(),
  });

  const toggleProvider = (providerId) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SSO Policy</h1>
        <p className="text-sm text-muted-foreground">
          Configure allowed identity providers, enforcement rules, and domain restrictions for your tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Providers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {PROVIDERS.map((provider) => (
            <label key={provider.id} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={selectedProviders.includes(provider.id)}
                onCheckedChange={() => toggleProvider(provider.id)}
                aria-label={provider.label}
              />
              <span>{provider.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SSO Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <Checkbox checked={requireSso} onCheckedChange={() => setRequireSso((v) => !v)} />
            <div>
              <div className="text-sm font-medium">Require SSO for staff</div>
              <p className="text-xs text-muted-foreground">All district users must authenticate through approved providers.</p>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Enforcement mode</div>
            <Input
              value={enforcementMode}
              onChange={(e) => setEnforcementMode(e.target.value)}
              placeholder="optional | strict | phased"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Allowed domains (one per line)</div>
            <Textarea
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              rows={4}
              placeholder="district.edu\nsubdomain.district.edu"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder={'{ "review_cycle": "quarterly" }'}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isLoading || !districtId}
        >
          {saveMutation.isLoading ? 'Saving…' : 'Save policy'}
        </Button>
      </div>
      {saveMutation.error ? (
        <div className="text-sm text-red-600">{String(saveMutation.error)}</div>
      ) : null}
    </div>
  );
}
