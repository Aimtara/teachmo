import { useEffect, useMemo, useState } from 'react';
import { useUserData } from '@nhost/react';
import { NotificationsAPI } from '@/api/adapters';

const DEFAULT_PREFS = {
  email_enabled: true,
  in_app_enabled: true,
  directory_alerts: true,
  digest_mode: 'immediate',
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'America/New_York',
  digest_hour: 7,
  invites_alerts: true,
  messaging_alerts: true,
  directory_digest: true,
  invites_digest: false,
  messaging_digest: false,
};

function formatHourLabel(hour) {
  const normalized = Number(hour) || 0;
  const suffix = normalized < 12 ? 'AM' : 'PM';
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour}:00 ${suffix}`;
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export default function NotificationPreferences() {
  const user = useUserData();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: formatHourLabel(hour) })),
    []
  );

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      setLoading(true);
      try {
        const existing = await NotificationsAPI.getPreferences(user.id);
        setPrefs({ ...DEFAULT_PREFS, ...(existing || {}) });
        setError('');
      } catch (err) {
        console.error(err);
        setError(err?.message ?? 'Unable to load notification preferences');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.id]);

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const digestHourValue = prefs.digest_hour === '' ? DEFAULT_PREFS.digest_hour : Number(prefs.digest_hour);
      const payload = {
        ...prefs,
        digest_hour: Number.isFinite(digestHourValue) ? digestHourValue : DEFAULT_PREFS.digest_hour,
        quiet_hours_start: toNumberOrNull(prefs.quiet_hours_start),
        quiet_hours_end: toNumberOrNull(prefs.quiet_hours_end),
        timezone: prefs.timezone || DEFAULT_PREFS.timezone,
      };

      await NotificationsAPI.savePreferences(user.id, payload);
      setSuccess('Preferences saved');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Unable to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <p className="p-6 text-gray-600">Please sign in to manage notifications.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-gray-500">Control how Teachmo keeps you informed</p>
        <h1 className="text-3xl font-semibold text-gray-900">Notification preferences</h1>
        <p className="text-sm text-gray-600">
          Choose in-app vs email alerts, daily digests, and quiet hours to keep notifications district-friendly.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Delivery channels</h2>
            <p className="text-sm text-gray-600">Enable in-app and email alerts for directory updates.</p>
          </header>

          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">In-app notifications</p>
                <p className="text-sm text-gray-600">Show alerts in Teachmo.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600"
                checked={prefs.in_app_enabled}
                onChange={(e) => updatePref('in_app_enabled', e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">Email notifications</p>
                <p className="text-sm text-gray-600">Send alerts to {user.email || 'your email'}.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600"
                checked={prefs.email_enabled}
                onChange={(e) => updatePref('email_enabled', e.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Email timing</h2>
            <p className="text-sm text-gray-600">Choose immediate alerts or a daily digest.</p>
          </header>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800" htmlFor="digest-mode">
                Digest mode
              </label>
              <select
                id="digest-mode"
                value={prefs.digest_mode}
                onChange={(e) => updatePref('digest_mode', e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="immediate">Immediate (send right away)</option>
                <option value="daily">Daily digest</option>
                <option value="off">Off</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                Daily digests bundle unread alerts into one email. Immediate mode respects quiet hours.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-800" htmlFor="digest-hour">
                Digest send hour
                <input
                  id="digest-hour"
                  type="number"
                  min="0"
                  max="23"
                  value={prefs.digest_hour}
                  onChange={(e) => updatePref('digest_hour', e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-500">Local time, 0-23 (default 7 = 7 AM)</span>
              </label>

              <label className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">Include directory alerts in digest</p>
                  <p className="text-sm text-gray-600">Uncheck to skip emails but keep in-app alerts.</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-emerald-600"
                  checked={prefs.directory_digest}
                  onChange={(e) => updatePref('directory_digest', e.target.checked)}
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Directory alerts</h2>
          <p className="text-sm text-gray-600">Control when directory sync issues trigger alerts.</p>
        </header>

        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">Directory alerts</p>
              <p className="text-sm text-gray-600">Turn off to silence directory sync notifications entirely.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-600"
              checked={prefs.directory_alerts}
              onChange={(e) => updatePref('directory_alerts', e.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Quiet hours & timezone</h2>
          <p className="text-sm text-gray-600">
            Immediate emails are paused during quiet hours and sent with the next digest for your timezone.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-800" htmlFor="quiet-start">
              Quiet hours start
            </label>
            <select
              id="quiet-start"
              value={prefs.quiet_hours_start ?? ''}
              onChange={(e) => updatePref('quiet_hours_start', e.target.value === '' ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">No quiet hours</option>
              {hourOptions.map((opt) => (
                <option key={`start-${opt.value}`} value={opt.value}>
                  {formatHourLabel(opt.value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800" htmlFor="quiet-end">
              Quiet hours end
            </label>
            <select
              id="quiet-end"
              value={prefs.quiet_hours_end ?? ''}
              onChange={(e) => updatePref('quiet_hours_end', e.target.value === '' ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">No quiet hours</option>
              {hourOptions.map((opt) => (
                <option key={`end-${opt.value}`} value={opt.value}>
                  {formatHourLabel(opt.value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800" htmlFor="timezone">
              Timezone
            </label>
            <input
              id="timezone"
              type="text"
              value={prefs.timezone}
              onChange={(e) => updatePref('timezone', e.target.value)}
              placeholder="America/New_York"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-500">IANA timezone name, e.g., America/Chicago</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSave}
          className="inline-flex items-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
