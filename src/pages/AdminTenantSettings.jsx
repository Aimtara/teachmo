import { useEffect, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { nhost } from '@/lib/nhostClient';
import { getApiBaseUrl } from '@/config/api';

const DEFAULT_BRANDING = {
  name: '',
  logo_url: '',
  primary: '',
  accent: '',
  background: '',
  foreground: ''
};

export default function AdminTenantSettings() {
  const { isAuthenticated } = useAuthenticationStatus();
  const tenant = useTenant();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [settingsJson, setSettingsJson] = useState('{}');
  const [status, setStatus] = useState('');

  const buildHeaders = async () => {
    const token = await nhost.auth.getAccessToken();
    const requestHeaders = { 'content-type': 'application/json' };
    if (token) requestHeaders.authorization = `Bearer ${token}`;
    if (tenant.organizationId) requestHeaders['x-teachmo-org-id'] = tenant.organizationId;
    if (tenant.schoolId) requestHeaders['x-teachmo-school-id'] = tenant.schoolId;
    return requestHeaders;
  };

  useEffect(() => {
    if (tenant.loading || !tenant.organizationId) return;
    const load = async () => {
      const requestHeaders = await buildHeaders();

      const res = await fetch(`${getApiBaseUrl()}/tenants/settings`, { headers: requestHeaders });
      const json = await res.json();
      const loadedBranding = json?.settings?.branding || {};
      const loadedSettings = json?.settings?.settings || {};
      setBranding({ ...DEFAULT_BRANDING, ...loadedBranding });
      setSettingsJson(JSON.stringify(loadedSettings, null, 2));
    };
    load();
  }, [tenant.loading, tenant.organizationId, tenant.schoolId]);

  const updateBranding = (field, value) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (evt) => {
    evt.preventDefault();
    setStatus('Saving settings…');
    try {
      const parsed = settingsJson ? JSON.parse(settingsJson) : {};
      const requestHeaders = await buildHeaders();
      await fetch(`${getApiBaseUrl()}/tenants/settings`, {
        method: 'PUT',
        headers: requestHeaders,
        body: JSON.stringify({ branding, settings: parsed })
      });
      setStatus('Tenant settings saved.');
    } catch (err) {
      setStatus(`Failed to save settings: ${err.message}`);
    }
  };

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (tenant.loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading tenant…</div>;
  if (!tenant.organizationId) return <div className="p-6 text-center text-sm text-destructive">Missing tenant scope.</div>;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Tenant settings</h1>
        <p className="text-gray-600">Manage branding and feature flags for your district or school.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Display name</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.name}
                onChange={(e) => updateBranding('name', e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Logo URL</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.logo_url}
                onChange={(e) => updateBranding('logo_url', e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Primary color</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.primary}
                onChange={(e) => updateBranding('primary', e.target.value)}
                placeholder="#1E40AF"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Accent color</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.accent}
                onChange={(e) => updateBranding('accent', e.target.value)}
                placeholder="#F59E0B"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Background color</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.background}
                onChange={(e) => updateBranding('background', e.target.value)}
                placeholder="#F8FAFC"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">Foreground color</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={branding.foreground}
                onChange={(e) => updateBranding('foreground', e.target.value)}
                placeholder="#0F172A"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Settings JSON</h2>
          <p className="text-sm text-muted-foreground">Use JSON for feature flags and configuration overrides.</p>
          <textarea
            className="w-full min-h-[220px] rounded border px-3 py-2 font-mono text-sm"
            value={settingsJson}
            onChange={(e) => setSettingsJson(e.target.value)}
          />
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Save settings</button>
          {status && <span className="text-sm text-muted-foreground">{status}</span>}
        </div>
      </form>
    </div>
  );
}
