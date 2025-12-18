import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@nhost/react';
import { DirectorySourcesAdminAPI } from '@/api/adapters';

const SOURCE_TYPES = [
  { value: 'https_url', label: 'HTTPS URL' },
  { value: 'sftp', label: 'SFTP' },
  { value: 'google_drive', label: 'Google Drive / Sheets' },
  { value: 'oneroster_rest', label: 'OneRoster REST' },
  { value: 'clever_secure_sync', label: 'Clever Secure Sync' },
  { value: 'classlink_roster_server', label: 'ClassLink Roster Server (OneRoster)' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStats(stats = {}) {
  const entries = [
    ['Rows', stats.totalRows],
    ['Valid', stats.totalValid],
    ['Invalid', stats.invalid],
    ['Upserted', stats.upserted],
    ['Deactivated', stats.deactivated],
  ].filter(([, val]) => val !== undefined);

  if (entries.length === 0) return '—';
  return entries.map(([label, val]) => `${label}: ${val}`).join(' • ');
}

function headersToString(headers) {
  if (!headers) return '';
  try {
    return JSON.stringify(headers, null, 2);
  } catch {
    return '';
  }
}

export default function AdminDirectorySources() {
  const user = useUserData();
  const defaultSchoolId = useMemo(
    () => String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim(),
    [user]
  );

  const [sources, setSources] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [runOptions, setRunOptions] = useState({ deactivateMissing: true, dryRun: false });

  const [form, setForm] = useState({
    name: '',
    school_id: defaultSchoolId || '',
    district_id: '',
    source_type: 'https_url',
    configUrl: '',
    configHeaders: '',
    configHost: '',
    configPort: '22',
    configUsername: '',
    configRemotePath: '',
    configFileId: '',
    configSupportsAllDrives: true,
    configForceExportCsv: false,
    configBaseUrl: '',
    configApiRoot: '/ims/oneroster/v1p1',
    configTokenUrl: '',
    configContactRoles: 'contact,guardian,parent,teacher,staff',
    configEmailFields: 'email,emailAddress,username',
    configRoleFieldPaths: 'role,roles',
    configApiVersion: 'v3.0',
    configRoleFilter: 'contact',
    is_enabled: true,
    schedule_cron: '',
    schedule_tz: 'America/New_York',
  });

  useEffect(() => {
    if (defaultSchoolId && !form.school_id) {
      setForm((prev) => ({ ...prev, school_id: defaultSchoolId }));
    }
  }, [defaultSchoolId, form.school_id]);

  const loadRuns = useCallback(async (id) => {
    if (!id) return;
    setLoadingRuns(true);
    try {
      const data = await DirectorySourcesAdminAPI.listRuns(id);
      setRuns(data);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load run history');
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  const selectSource = useCallback((source) => {
    setSelectedId(source?.id ?? '');
    setRuns([]);
    if (!source) {
      setForm((prev) => ({
        ...prev,
        name: '',
        school_id: defaultSchoolId || '',
        district_id: '',
        source_type: 'https_url',
        configUrl: '',
        configHeaders: '',
        configHost: '',
        configPort: '22',
        configUsername: '',
        configRemotePath: '',
        configFileId: '',
        configSupportsAllDrives: true,
        configForceExportCsv: false,
        configBaseUrl: '',
        configApiRoot: '/ims/oneroster/v1p1',
        configTokenUrl: '',
        configContactRoles: 'contact,guardian,parent,teacher,staff',
        configEmailFields: 'email,emailAddress,username',
        configRoleFieldPaths: 'role,roles',
        configApiVersion: 'v3.0',
        configRoleFilter: 'contact',
        is_enabled: true,
        schedule_cron: '',
        schedule_tz: 'America/New_York',
      }));
      return;
    }

    const config = source.config ?? {};
    setForm({
      name: source.name ?? '',
      school_id: source.school_id ?? '',
      district_id: source.district_id ?? '',
      source_type: source.source_type ?? 'https_url',
      configUrl: config.url ?? '',
      configHeaders: headersToString(config.headers),
      configHost: config.host ?? '',
      configPort: String(config.port ?? '22'),
      configUsername: config.username ?? '',
      configRemotePath: config.remotePath ?? '',
      configFileId: config.fileId ?? '',
      configSupportsAllDrives: config.supportsAllDrives ?? true,
      configForceExportCsv: Boolean(config.forceExportCsv),
      configBaseUrl: config.baseUrl ?? '',
      configApiRoot: config.apiRoot ?? '/ims/oneroster/v1p1',
      configTokenUrl: config.auth?.tokenUrl ?? '',
      configContactRoles: Array.isArray(config.extract?.contactRoles)
        ? config.extract.contactRoles.join(',')
        : 'contact,guardian,parent,teacher,staff',
      configEmailFields: Array.isArray(config.extract?.emailFields)
        ? config.extract.emailFields.join(',')
        : 'email,emailAddress,username',
      configRoleFieldPaths: Array.isArray(config.extract?.roleFieldPaths)
        ? config.extract.roleFieldPaths.join(',')
        : 'role,roles',
      configApiVersion: config.apiVersion ?? 'v3.0',
      configRoleFilter: config.contacts?.roleFilter ?? 'contact',
      is_enabled: Boolean(source.is_enabled),
      schedule_cron: source.schedule_cron ?? '',
      schedule_tz: source.schedule_tz ?? 'America/New_York',
    });
    loadRuns(source.id);
  }, [defaultSchoolId, loadRuns]);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await DirectorySourcesAdminAPI.listSources();
      setSources(list);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load directory sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (sources && sources.length > 0 && !selectedId) {
      selectSource(sources[0]);
    }
  }, [sources, selectedId, selectSource]);
  const buildConfig = () => {
    if (form.source_type === 'https_url') {
      let headers = {};
      if (form.configHeaders) {
        try {
          headers = JSON.parse(form.configHeaders);
        } catch {
          throw new Error('Headers JSON is invalid');
        }
      }
      return { url: form.configUrl, headers };
    }

    if (form.source_type === 'google_drive') {
      const fileId = String(form.configFileId || '').trim();
      if (!fileId) {
        throw new Error('Google Drive fileId is required.');
      }

      return {
        fileId,
        supportsAllDrives: Boolean(form.configSupportsAllDrives),
        forceExportCsv: Boolean(form.configForceExportCsv),
      };
    }

    if (['oneroster_rest', 'classlink_roster_server'].includes(form.source_type)) {
      const baseUrl = String(form.configBaseUrl || '').trim();
      if (!baseUrl) throw new Error('Base URL is required.');
      if (!form.configTokenUrl && form.source_type !== 'classlink_roster_server') {
        throw new Error('Token URL is required for OneRoster OAuth.');
      }

      const contactRoles = String(form.configContactRoles || '')
        .split(',')
        .map((val) => val.trim())
        .filter(Boolean);
      const emailFields = String(form.configEmailFields || '')
        .split(',')
        .map((val) => val.trim())
        .filter(Boolean);
      const roleFieldPaths = String(form.configRoleFieldPaths || '')
        .split(',')
        .map((val) => val.trim())
        .filter(Boolean);

      return {
        baseUrl,
        apiRoot: form.configApiRoot || '/ims/oneroster/v1p1',
        auth: { mode: 'oauth_client_credentials', tokenUrl: form.configTokenUrl || undefined },
        extract: {
          contactRoles: contactRoles.length ? contactRoles : ['contact', 'guardian', 'parent', 'teacher', 'staff'],
          emailFields: emailFields.length ? emailFields : ['email', 'emailAddress', 'username'],
          roleFieldPaths: roleFieldPaths.length ? roleFieldPaths : ['role', 'roles'],
        },
      };
    }

    if (form.source_type === 'clever_secure_sync') {
      const baseUrl = String(form.configBaseUrl || 'https://api.clever.com');
      const apiVersion = String(form.configApiVersion || 'v3.0');
      const roleFilter = String(form.configRoleFilter || 'contact');

      return {
        baseUrl,
        apiVersion,
        mode: 'district',
        contacts: { roleFilter },
      };
    }

    return {
      host: form.configHost,
      port: Number(form.configPort) || 22,
      username: form.configUsername,
      remotePath: form.configRemotePath,
    };
  };

  const selectedSourceType = useMemo(
    () => SOURCE_TYPES.find((type) => type.value === form.source_type),
    [form.source_type]
  );

  const handleSave = async (evt) => {
    evt.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const config = buildConfig();
      const payload = {
        name: form.name,
        school_id: form.school_id,
        district_id: form.district_id || null,
        source_type: form.source_type,
        config,
        is_enabled: form.is_enabled,
        schedule_cron: form.schedule_cron || null,
        schedule_tz: form.schedule_tz || 'America/New_York',
      };

      let targetId = selectedId;
      if (selectedId) {
        await DirectorySourcesAdminAPI.updateSource(selectedId, payload);
        setSuccess('Source updated.');
      } else {
        const created = await DirectorySourcesAdminAPI.createSource(payload);
        targetId = created?.id ?? '';
        setSelectedId(targetId);
        setSuccess('Source created.');
      }

      await loadSources();
      if (targetId) {
        loadRuns(targetId);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!selectedId) return;
    setSyncingId(selectedId);
    setError('');
    setSuccess('');
    try {
      await DirectorySourcesAdminAPI.syncSource(selectedId, runOptions);
      setSuccess('Sync started.');
      await loadRuns(selectedId);
      await loadSources();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Sync failed');
    } finally {
      setSyncingId('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Directory sources</h1>
        <p className="text-gray-600">Manage scheduled roster sources and trigger on-demand syncs.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white rounded shadow p-4 space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Sources</h2>
              <p className="text-sm text-gray-600">Select a source to edit or run.</p>
            </div>
            <button
              type="button"
              onClick={() => selectSource(null)}
              className="text-sm text-blue-600 hover:underline"
              aria-label="Create new directory source"
            >
              New
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600 text-sm">Loading sources…</p>
          ) : (
            <div className="space-y-2">
              {sources.length === 0 && <p className="text-sm text-gray-500">No sources yet.</p>}
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => selectSource(source)}
                  className={`w-full text-left border rounded p-3 ${selectedId === source.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{source.name}</p>
                      <p className="text-xs text-gray-600">
                        {source.source_type} • School {source.school_id?.slice(0, 6) || '—'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${source.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {source.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Last run: {formatDate(source.last_run_at)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded shadow p-4 space-y-4 lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Fall roster"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Source type</span>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value} disabled={type.comingSoon}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">School ID</span>
                <input
                  required
                  value={form.school_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_id: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="uuid-for-school"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">District ID (optional)</span>
                <input
                  value={form.district_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, district_id: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="uuid-for-district"
                />
              </label>
            </div>

            {form.source_type === 'https_url' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">HTTPS URL</span>
                  <input
                    required
                    value={form.configUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, configUrl: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://district.org/exports/roster.csv"
                  />
                </label>
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Headers (JSON, secrets supported)</span>
                  <textarea
                    value={form.configHeaders}
                    onChange={(e) => setForm((prev) => ({ ...prev, configHeaders: e.target.value }))}
                    rows={4}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    placeholder='{\n  "Authorization": "Bearer {{secret.bearerToken}}"\n}'
                  />
                  <p className="text-xs text-gray-500">
                    Use <code>{{'{{secret.yourKey}}'}}</code> to reference values from DIRECTORY_SOURCE_SECRETS_JSON.
                  </p>
                </label>
              </div>
            )}

            {form.source_type === 'google_drive' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Google Drive file ID</span>
                  <input
                    required
                    value={form.configFileId}
                    onChange={(e) => setForm((prev) => ({ ...prev, configFileId: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1AbC..."
                  />
                  <p className="text-xs text-gray-500">
                    Share the file with the service account used for directory sync. If it&apos;s a Google Sheet, Teachmo exports
                    it as CSV automatically.
                  </p>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.configSupportsAllDrives}
                    onChange={(e) => setForm((prev) => ({ ...prev, configSupportsAllDrives: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Supports shared drives</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.configForceExportCsv}
                    onChange={(e) => setForm((prev) => ({ ...prev, configForceExportCsv: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Force CSV export</span>
                </label>
              </div>
            )}

            {['oneroster_rest', 'classlink_roster_server'].includes(form.source_type) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Base URL</span>
                    <input
                      required
                      value={form.configBaseUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, configBaseUrl: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://district.example.com"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">API Root</span>
                    <input
                      value={form.configApiRoot}
                      onChange={(e) => setForm((prev) => ({ ...prev, configApiRoot: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="/ims/oneroster/v1p1"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">Token URL</span>
                    <input
                      value={form.configTokenUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, configTokenUrl: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://district.example.com/oauth/token"
                    />
                    <p className="text-xs text-gray-500">OAuth2 client_credentials tokens are cached per source.</p>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">Roles to import</span>
                    <input
                      value={form.configContactRoles}
                      onChange={(e) => setForm((prev) => ({ ...prev, configContactRoles: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="contact,guardian,parent,teacher,staff"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">Email field fallbacks</span>
                    <input
                      value={form.configEmailFields}
                      onChange={(e) => setForm((prev) => ({ ...prev, configEmailFields: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="email,emailAddress,username"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">Role field paths</span>
                    <input
                      value={form.configRoleFieldPaths}
                      onChange={(e) => setForm((prev) => ({ ...prev, configRoleFieldPaths: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="role,roles"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  ClassLink Roster Server is OneRoster REST; Clever/OneRoster credentials live in <code>DIRECTORY_SOURCE_SECRETS_JSON</code>.
                </p>
              </div>
            )}

            {form.source_type === 'clever_secure_sync' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Base URL</span>
                    <input
                      value={form.configBaseUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, configBaseUrl: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://api.clever.com"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700">API Version</span>
                    <input
                      value={form.configApiVersion}
                      onChange={(e) => setForm((prev) => ({ ...prev, configApiVersion: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="v3.0"
                    />
                  </label>
                </div>
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Role filter</span>
                  <input
                    value={form.configRoleFilter}
                    onChange={(e) => setForm((prev) => ({ ...prev, configRoleFilter: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="contact"
                  />
                  <p className="text-xs text-gray-500">Clever Secure Sync requires district connection and partner approval.</p>
                </label>
              </div>
            )}

            {form.source_type === 'sftp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Host</span>
                  <input
                    required
                    value={form.configHost}
                    onChange={(e) => setForm((prev) => ({ ...prev, configHost: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="sftp.district.org"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Port</span>
                  <input
                    type="number"
                    value={form.configPort}
                    onChange={(e) => setForm((prev) => ({ ...prev, configPort: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="22"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Username</span>
                  <input
                    required
                    value={form.configUsername}
                    onChange={(e) => setForm((prev) => ({ ...prev, configUsername: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="teachmo"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Remote path</span>
                  <input
                    required
                    value={form.configRemotePath}
                    onChange={(e) => setForm((prev) => ({ ...prev, configRemotePath: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="/exports/roster.csv"
                  />
                </label>
                <p className="text-xs text-gray-500 md:col-span-2">
                  Passwords live in <code>DIRECTORY_SOURCE_SECRETS_JSON</code> as <code>sftpPassword</code> for the source.
                </p>
              </div>
            )}

            {selectedSourceType?.comingSoon && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                {selectedSourceType.label} is planned but not available yet.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_enabled: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>

              <label className="block space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Schedule (cron, optional)</span>
                <input
                  value={form.schedule_cron}
                  onChange={(e) => setForm((prev) => ({ ...prev, schedule_cron: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0 3 * * *"
                />
                <p className="text-xs text-gray-500">Informational only; GitHub Action triggers the sync daily.</p>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={saving || selectedSourceType?.comingSoon}
              >
                {saving ? 'Saving…' : selectedId ? 'Update source' : 'Create source'}
              </button>
              {success && <span className="text-sm text-green-700">{success}</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Run now</h3>
                <p className="text-sm text-gray-600">Validate and sync immediately.</p>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={!selectedId || syncingId === selectedId}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {syncingId === selectedId ? 'Running…' : 'Run source'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={runOptions.dryRun}
                  onChange={(e) => setRunOptions((prev) => ({ ...prev, dryRun: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Dry run (no writes)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={runOptions.deactivateMissing}
                  onChange={(e) => setRunOptions((prev) => ({ ...prev, deactivateMissing: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Deactivate missing</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Recent runs</h3>
                <p className="text-sm text-gray-600">Last 10 sync attempts.</p>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                onClick={() => loadRuns(selectedId)}
                disabled={!selectedId || loadingRuns}
                aria-disabled={!selectedId || loadingRuns}
                aria-label={
                  !selectedId
                    ? 'Refresh run history (select a source to enable)'
                    : loadingRuns
                      ? 'Refreshing run history'
                      : 'Refresh run history'
                }
              >
                {loadingRuns ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {!selectedId && <p className="text-sm text-gray-500">Select a source to view history.</p>}
            {selectedId && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="p-2">Started</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Job</th>
                      <th className="p-2">Stats</th>
                      <th className="p-2">Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-3 text-gray-500">
                          No runs yet.
                        </td>
                      </tr>
                    )}
                    {runs.map((run) => (
                      <tr key={run.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{formatDate(run.started_at)}</td>
                        <td className="p-2 font-medium">{run.status}</td>
                        <td className="p-2 font-mono text-xs">{run.job_id || '—'}</td>
                        <td className="p-2">{formatStats(run.stats)}</td>
                        <td className="p-2 whitespace-nowrap">{formatDate(run.finished_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
