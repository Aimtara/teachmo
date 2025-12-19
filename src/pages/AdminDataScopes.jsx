import React, { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@nhost/react';
import { DataScopesAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mergeScopes, resolveEffectiveScopes, SYSTEM_SCOPE_DEFAULTS } from '@/utils/scopes';

function CheckboxField({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export default function AdminDataScopes() {
  const user = useUserData();
  const districtId = useMemo(
    () => String(user?.metadata?.district_id ?? user?.metadata?.districtId ?? '').trim(),
    [user]
  );
  const defaultSchoolId = useMemo(
    () => String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim(),
    [user]
  );

  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [districtScopes, setDistrictScopes] = useState(SYSTEM_SCOPE_DEFAULTS);
  const [schoolScopes, setSchoolScopes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingDistrict, setSavingDistrict] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSchoolId(defaultSchoolId);
  }, [defaultSchoolId]);

  const resolvedDistrictScopes = useMemo(
    () => mergeScopes(SYSTEM_SCOPE_DEFAULTS, districtScopes ?? {}),
    [districtScopes]
  );
  const resolvedSchoolScopes = useMemo(
    () => (schoolScopes ? mergeScopes(SYSTEM_SCOPE_DEFAULTS, schoolScopes) : null),
    [schoolScopes]
  );
  const effectiveScopes = useMemo(
    () => resolveEffectiveScopes({ districtScopes, schoolScopes: schoolScopes ?? {} }),
    [districtScopes, schoolScopes]
  );

  const fetchScopes = async () => {
    if (!districtId) {
      setError('District ID required to manage data scopes.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await DataScopesAPI.fetchDataScopes({ districtId, schoolId });
      setDistrictScopes(result.districtScopes ?? SYSTEM_SCOPE_DEFAULTS);
      setSchoolScopes(result.schoolScopes);
    } catch (err) {
      console.error(err);
      setError('Unable to load scopes right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopes();
  }, [districtId, schoolId]);

  const updateDistrictScope = (section, key, value) => {
    setDistrictScopes((prev) => {
      const base = prev ?? {};
      return { ...base, [section]: { ...(base?.[section] ?? {}), [key]: value } };
    });
  };

  const updateSchoolScope = (section, key, value) => {
    setSchoolScopes((prev) => {
      const base = prev ?? { ...SYSTEM_SCOPE_DEFAULTS };
      return { ...base, [section]: { ...(base?.[section] ?? {}), [key]: value } };
    });
  };

  const handleSaveDistrict = async () => {
    if (!districtId) {
      setError('District ID required to save scopes.');
      return;
    }

    setSavingDistrict(true);
    setMessage('');
    setError('');
    try {
      await DataScopesAPI.saveDistrictScopes(districtId, districtScopes);
      setMessage('District scopes saved.');
      await fetchScopes();
    } catch (err) {
      console.error(err);
      setError('Unable to save district scopes.');
    } finally {
      setSavingDistrict(false);
    }
  };

  const handleSaveSchool = async () => {
    if (!districtId || !schoolId) {
      setError('School ID required to save overrides.');
      return;
    }

    setSavingSchool(true);
    setMessage('');
    setError('');
    try {
      await DataScopesAPI.saveSchoolScopes(schoolId, districtId, schoolScopes ?? resolvedDistrictScopes);
      setMessage('School override saved.');
      await fetchScopes();
    } catch (err) {
      console.error(err);
      setError('Unable to save school override.');
    } finally {
      setSavingSchool(false);
    }
  };

  const districtDomainLists = useMemo(
    () => ({
      allow: (resolvedDistrictScopes.directory?.emailAllowlistDomains ?? []).join('\n'),
      deny: (resolvedDistrictScopes.directory?.emailDenylistDomains ?? []).join('\n')
    }),
    [resolvedDistrictScopes]
  );

  const schoolDomainLists = useMemo(
    () => ({
      allow: (resolvedSchoolScopes?.directory?.emailAllowlistDomains ?? []).join('\n'),
      deny: (resolvedSchoolScopes?.directory?.emailDenylistDomains ?? []).join('\n')
    }),
    [resolvedSchoolScopes]
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Data scopes / consent</h1>
      <p className="text-sm text-gray-600">
        Districts choose which roster and messaging fields Teachmo may use. These settings are enforced everywhere and
        snapshotted on directory imports for auditability.
      </p>

      {!districtId && (
        <Card>
          <p className="text-sm text-red-700">
            Add a district_id to your profile metadata to manage consent settings.
          </p>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">District defaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              label="Use email (required)"
              checked={Boolean(resolvedDistrictScopes.directory?.email)}
              onChange={(val) => updateDistrictScope('directory', 'email', val)}
              disabled
            />
            <CheckboxField
              label="Store names"
              checked={Boolean(resolvedDistrictScopes.directory?.names)}
              onChange={(val) => updateDistrictScope('directory', 'names', val)}
            />
            <CheckboxField
              label="Store external IDs"
              checked={Boolean(resolvedDistrictScopes.directory?.externalIds)}
              onChange={(val) => updateDistrictScope('directory', 'externalIds', val)}
            />
            <CheckboxField
              label="Allow sending invites"
              checked={Boolean(resolvedDistrictScopes.messaging?.sendInvites)}
              onChange={(val) => updateDistrictScope('messaging', 'sendInvites', val)}
            />
            <CheckboxField
              label="Allow email delivery"
              checked={Boolean(resolvedDistrictScopes.messaging?.useEmail)}
              onChange={(val) => updateDistrictScope('messaging', 'useEmail', val)}
            />
            <CheckboxField
              label="Enable analytics"
              checked={Boolean(resolvedDistrictScopes.analytics?.enabled)}
              onChange={(val) => updateDistrictScope('analytics', 'enabled', val)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-800">Email domain controls</h3>
            <p className="text-xs text-gray-500">One domain per line</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Allowlist domains</label>
                <Input
                  as="textarea"
                  rows={4}
                  value={districtDomainLists.allow}
                  onChange={(e) =>
                    updateDistrictScope(
                      'directory',
                      'emailAllowlistDomains',
                      e.target.value.split('\n').filter(Boolean)
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Denylist domains</label>
                <Input
                  as="textarea"
                  rows={4}
                  value={districtDomainLists.deny}
                  onChange={(e) =>
                    updateDistrictScope(
                      'directory',
                      'emailDenylistDomains',
                      e.target.value.split('\n').filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveDistrict} disabled={loading || savingDistrict || !districtId}>
              {savingDistrict ? 'Saving…' : 'Save district scopes'}
            </Button>
            <Button variant="ghost" onClick={fetchScopes} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Per-school override (optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700">School ID</label>
              <Input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="uuid-for-school" />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchScopes} disabled={loading}>
                Load override
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            When set, a school override takes precedence over the district defaults for that school.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              label="Use email (required)"
              checked={resolvedSchoolScopes ? resolvedSchoolScopes.directory?.email !== false : true}
              onChange={(val) => updateSchoolScope('directory', 'email', val)}
              disabled
            />
            <CheckboxField
              label="Store names"
              checked={resolvedSchoolScopes ? Boolean(resolvedSchoolScopes.directory?.names) : Boolean(effectiveScopes.directory?.names)}
              onChange={(val) => updateSchoolScope('directory', 'names', val)}
            />
            <CheckboxField
              label="Store external IDs"
              checked={resolvedSchoolScopes ? Boolean(resolvedSchoolScopes.directory?.externalIds) : Boolean(effectiveScopes.directory?.externalIds)}
              onChange={(val) => updateSchoolScope('directory', 'externalIds', val)}
            />
            <CheckboxField
              label="Allow sending invites"
              checked={resolvedSchoolScopes ? Boolean(resolvedSchoolScopes.messaging?.sendInvites) : Boolean(effectiveScopes.messaging?.sendInvites)}
              onChange={(val) => updateSchoolScope('messaging', 'sendInvites', val)}
            />
            <CheckboxField
              label="Allow email delivery"
              checked={resolvedSchoolScopes ? Boolean(resolvedSchoolScopes.messaging?.useEmail) : Boolean(effectiveScopes.messaging?.useEmail)}
              onChange={(val) => updateSchoolScope('messaging', 'useEmail', val)}
            />
            <CheckboxField
              label="Enable analytics"
              checked={resolvedSchoolScopes ? Boolean(resolvedSchoolScopes.analytics?.enabled) : Boolean(effectiveScopes.analytics?.enabled)}
              onChange={(val) => updateSchoolScope('analytics', 'enabled', val)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-800">Email domain controls</h3>
            <p className="text-xs text-gray-500">One domain per line</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Allowlist domains</label>
                <Input
                  as="textarea"
                  rows={4}
                  value={schoolDomainLists.allow}
                  onChange={(e) =>
                    updateSchoolScope(
                      'directory',
                      'emailAllowlistDomains',
                      e.target.value.split('\n').filter(Boolean)
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Denylist domains</label>
                <Input
                  as="textarea"
                  rows={4}
                  value={schoolDomainLists.deny}
                  onChange={(e) =>
                    updateSchoolScope(
                      'directory',
                      'emailDenylistDomains',
                      e.target.value.split('\n').filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveSchool} disabled={loading || savingSchool || !schoolId || !districtId}>
              {savingSchool ? 'Saving…' : 'Save override'}
            </Button>
            <Button variant="ghost" onClick={() => setSchoolScopes(null)} disabled={savingSchool}>
              Clear override edits
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="font-medium text-gray-900">Effective scopes</h2>
          <p className="text-sm text-gray-600">
            Applied order: system defaults → district scopes → school override (if present).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-500">Directory</p>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>Email: {effectiveScopes.directory?.email !== false ? 'allowed' : 'blocked'}</li>
                <li>Names: {effectiveScopes.directory?.names ? 'stored' : 'not stored'}</li>
                <li>External IDs: {effectiveScopes.directory?.externalIds ? 'stored' : 'not stored'}</li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Messaging</p>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>Send invites: {effectiveScopes.messaging?.sendInvites !== false ? 'enabled' : 'disabled'}</li>
                <li>Email delivery: {effectiveScopes.messaging?.useEmail !== false ? 'enabled' : 'disabled'}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {(message || error) && (
        <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
