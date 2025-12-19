import React, { useMemo, useState, useEffect } from 'react';
import { nhost } from '@/utils/nhost';
import Button from '@/components/shared/Button';
import Card from '@/components/shared/Card';
import Input from '@/components/shared/Input';

const scopeDefaults = {
  directory: { email: true, names: false, externalIds: true },
  messaging: { sendInvites: true, useEmail: true },
  analytics: { enabled: false }
};

function CheckboxField({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export default function AdminDataScopes() {
  const [loading, setLoading] = useState(false);
  const [scopes, setScopes] = useState(scopeDefaults);
  const [message, setMessage] = useState('');

  const client = nhost.graphql;

  const fetchScopes = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await client.request(`query GetScopes { district_data_scopes(limit: 1) { scopes } }`);
      if (data?.district_data_scopes?.[0]?.scopes) {
        setScopes((prev) => ({ ...prev, ...data.district_data_scopes[0].scopes }));
      }
    } catch (error) {
      setMessage('Unable to load scopes right now.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      await client.request(
        `mutation UpsertScopes($scopes: jsonb!) {
          insert_district_data_scopes_one(
            object: { district_id: "00000000-0000-0000-0000-000000000000", scopes: $scopes },
            on_conflict: { constraint: district_data_scopes_district_id_key, update_columns: [scopes] }
          ) { id }
        }
        `,
        { scopes }
      );
      setMessage('Saved');
    } catch (error) {
      setMessage('Unable to save scopes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const domainLists = useMemo(
    () => ({
      allow: (scopes.directory?.emailAllowlistDomains ?? []).join('\n'),
      deny: (scopes.directory?.emailDenylistDomains ?? []).join('\n')
    }),
    [scopes]
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Data scopes / consent</h1>
      <p className="text-sm text-gray-600">
        Districts choose which roster and messaging fields Teachmo may use. These switches are a quick summary for privacy review.
      </p>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Directory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              label="Use email (required)"
              checked={Boolean(scopes.directory?.email)}
              onChange={(val) => setScopes((prev) => ({ ...prev, directory: { ...prev.directory, email: val } }))}
              disabled
            />
            <CheckboxField
              label="Store names"
              checked={Boolean(scopes.directory?.names)}
              onChange={(val) => setScopes((prev) => ({ ...prev, directory: { ...prev.directory, names: val } }))}
            />
            <CheckboxField
              label="Store external IDs"
              checked={Boolean(scopes.directory?.externalIds)}
              onChange={(val) => setScopes((prev) => ({ ...prev, directory: { ...prev.directory, externalIds: val } }))}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Messaging</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              label="Allow sending invites"
              checked={Boolean(scopes.messaging?.sendInvites)}
              onChange={(val) => setScopes((prev) => ({ ...prev, messaging: { ...prev.messaging, sendInvites: val } }))}
            />
            <CheckboxField
              label="Allow email delivery"
              checked={Boolean(scopes.messaging?.useEmail)}
              onChange={(val) => setScopes((prev) => ({ ...prev, messaging: { ...prev.messaging, useEmail: val } }))}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Analytics</h2>
          <CheckboxField
            label="Enable analytics"
            checked={Boolean(scopes.analytics?.enabled)}
            onChange={(val) => setScopes((prev) => ({ ...prev, analytics: { ...prev.analytics, enabled: val } }))}
          />
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Email domain controls</h2>
          <p className="text-xs text-gray-500">One domain per line</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-700">Allowlist domains</label>
              <Input
                as="textarea"
                rows={4}
                value={domainLists.allow}
                onChange={(e) =>
                  setScopes((prev) => ({
                    ...prev,
                    directory: { ...prev.directory, emailAllowlistDomains: e.target.value.split('\n').filter(Boolean) }
                  }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Denylist domains</label>
              <Input
                as="textarea"
                rows={4}
                value={domainLists.deny}
                onChange={(e) =>
                  setScopes((prev) => ({
                    ...prev,
                    directory: { ...prev.directory, emailDenylistDomains: e.target.value.split('\n').filter(Boolean) }
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save scopes'}
        </Button>
        <Button variant="ghost" onClick={fetchScopes} disabled={loading}>
          Refresh
        </Button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  );
}
