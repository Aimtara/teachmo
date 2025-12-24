import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function safeJsonParse(txt) {
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return {};
  }
}

export default function AdminTenantSettings() {
  const { data: scope } = useTenantScope();
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;

  const settingsQuery = useQuery({
    queryKey: ['tenant_settings', districtId, schoolId],
    enabled: !!districtId,
    queryFn: async () => {
      const query = `query TenantSettings($districtId: uuid!, $schoolId: uuid) {
        tenant_settings(
          where: {
            district_id: { _eq: $districtId },
            _or: [
              { school_id: { _eq: $schoolId } },
              { school_id: { _is_null: true } }
            ]
          },
          order_by: { school_id: desc_nulls_last }
        ) {
          id
          district_id
          school_id
          name
          branding
          settings
          updated_at
        }
      }`;

      const res = await graphql.request(query, { districtId, schoolId });
      return res.tenant_settings?.[0] ?? null;
    },
  });

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [settingsJson, setSettingsJson] = useState('{}');

  useMemo(() => {
    const row = settingsQuery.data;
    if (!row) return;
    setName(row.name ?? '');
    setLogoUrl(row.branding?.logo_url ?? '');
    setPrimaryColor(row.branding?.primary_color ?? '#111827');
    setAccentColor(row.branding?.accent_color ?? '#3b82f6');
    setSettingsJson(JSON.stringify(row.settings ?? {}, null, 2));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!districtId) throw new Error('Missing district scope');
      const branding = {
        logo_url: logoUrl || null,
        primary_color: primaryColor || null,
        accent_color: accentColor || null,
      };
      const settings = safeJsonParse(settingsJson);

      if (settingsQuery.data?.id) {
        const m = `mutation UpdateTenantSettings($id: uuid!, $changes: tenant_settings_set_input!) {
          update_tenant_settings_by_pk(pk_columns: { id: $id }, _set: $changes) { id updated_at }
        }`;
        await graphql.request(m, {
          id: settingsQuery.data.id,
          changes: { name, branding, settings },
        });
      } else {
        const m = `mutation InsertTenantSettings($object: tenant_settings_insert_input!) {
          insert_tenant_settings_one(object: $object) { id }
        }`;
        await graphql.request(m, {
          object: { district_id: districtId, school_id: schoolId, name, branding, settings },
        });
      }
    },
    onSuccess: () => settingsQuery.refetch(),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenant Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure district / school-level branding and settings. Stored in Hasura + enforced with DB RLS.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><span className="text-muted-foreground">District:</span> <span className="font-mono">{districtId ?? '—'}</span></div>
          <div><span className="text-muted-foreground">School:</span> <span className="font-mono">{schoolId ?? '—'}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Tenant name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Paterson Public Schools" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Logo URL</div>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://.../logo.png" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Primary color</div>
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Accent color</div>
            <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={settingsJson} onChange={(e) => setSettingsJson(e.target.value)} rows={10} />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isLoading || !districtId}>
              {saveMutation.isLoading ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {saveMutation.error ? (
            <div className="mt-2 text-sm text-red-600">{String(saveMutation.error)}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
