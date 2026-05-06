import { Bell, Home, Palette } from 'lucide-react';
import { enterpriseRoles } from '@/design/tokens';

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'highContrast', label: 'High contrast' }
];

export function EnterprisePreferencesPanel({ preferences, setPreference }) {
  return (
    <section
      className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-4 shadow-sm"
      aria-labelledby="enterprise-preferences-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="enterprise-preferences-title" className="font-heading text-lg font-semibold text-[var(--enterprise-foreground)]">
            Personalization
          </h2>
          <p className="mt-1 text-sm text-[var(--enterprise-muted)]">
            Role, density, landing page, and notification settings persist locally.
          </p>
        </div>
        <Palette className="h-5 w-5 text-[var(--enterprise-primary)]" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium text-[var(--enterprise-foreground)]">
          Theme
          <select
            className="enterprise-focus mt-1 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
            value={preferences.theme}
            onChange={(event) => setPreference('theme', event.target.value)}
          >
            {themes.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[var(--enterprise-foreground)]">
          Role context
          <select
            className="enterprise-focus mt-1 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
            value={preferences.role}
            onChange={(event) => setPreference('role', event.target.value)}
          >
            {Object.entries(enterpriseRoles).map(([role, config]) => (
              <option key={role} value={role}>
                {config.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[var(--enterprise-foreground)]">
          Density
          <select
            className="enterprise-focus mt-1 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
            value={preferences.density}
            onChange={(event) => setPreference('density', event.target.value)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>

        <label className="text-sm font-medium text-[var(--enterprise-foreground)]">
          <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Landing page
          <input
            className="enterprise-focus mt-1 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
            value={preferences.landingPage}
            onChange={(event) => setPreference('landingPage', event.target.value)}
          />
        </label>

        <label className="text-sm font-medium text-[var(--enterprise-foreground)]">
          <Bell className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Notifications
          <select
            className="enterprise-focus mt-1 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2"
            value={preferences.notifications}
            onChange={(event) => setPreference('notifications', event.target.value)}
          >
            <option value="critical">Critical only</option>
            <option value="priority">Priority digest</option>
            <option value="all">All updates</option>
          </select>
        </label>
      </div>
    </section>
  );
}
