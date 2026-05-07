import { useEffect, useState } from 'react';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

const tabs = ['Profile', 'Security', 'Notifications', 'Personalization', 'Privacy'];

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem('teachmo-theme') || 'light');
  const [activeTab, setActiveTab] = useState('Profile');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('tm-high-contrast', theme === 'high-contrast');
    localStorage.setItem('teachmo-theme', theme);
  }, [theme]);

  return (
    <EnterpriseSurface
      eyebrow="Preferences"
      title="Settings command center"
      description="Profile, security, notification, personalization, and privacy controls are grouped into task-based tabs with instant theme changes."
      badges={['WCAG 2.2 AA', 'FERPA/COPPA privacy', 'Reduced-motion safe']}
      metrics={[
        { label: 'Security posture', value: 'Strong', badge: 'SSO ready', trend: 'up' },
        { label: 'Privacy state', value: 'Opt-in', badge: 'Clear', trend: 'flat' },
        { label: 'Theme latency', value: 'Instant', badge: 'Live', trend: 'up' },
        { label: 'Channels', value: '5', badge: 'Tuned', trend: 'flat' }
      ]}
    >
      <EnterprisePanel title="Settings tabs" description="Keyboard-friendly tab buttons keep account controls discoverable.">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`enterprise-focus enterprise-motion rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? 'bg-[var(--enterprise-primary)] text-white shadow-[var(--enterprise-shadow)]'
                  : 'border border-[var(--enterprise-border)] text-[var(--enterprise-muted)] hover:text-[var(--enterprise-foreground)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_5%,transparent)] p-5">
          <h2 className="font-heading text-lg font-semibold">{activeTab}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--enterprise-muted)]">
            {activeTab === 'Privacy'
              ? 'Manage AI personalization opt-out, directory visibility, data export, and deletion requests with clear explanations.'
              : activeTab === 'Security'
                ? 'Review MFA, passkeys, SSO sessions, trusted devices, and security event history.'
                : activeTab === 'Personalization'
                  ? 'Tune role-aware recommendations, language, accessibility density, and quiet hours.'
                  : activeTab === 'Notifications'
                    ? 'Control real-time, digest, SMS, email, and weekly brief delivery preferences.'
                    : 'Update display name, school context, role details, and connected family or classroom profiles.'}
          </p>
        </div>
      </EnterprisePanel>

      <EnterprisePanel title="Theme" description="Changes apply immediately and respect dark and high-contrast modes.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['light', 'Light'],
            ['dark', 'Dark'],
            ['high-contrast', 'High contrast']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={`enterprise-focus enterprise-motion rounded-2xl border p-4 text-left text-sm font-semibold hover:-translate-y-0.5 ${
                theme === value
                  ? 'border-[var(--enterprise-primary)] bg-[color-mix(in_srgb,var(--enterprise-primary)_12%,transparent)]'
                  : 'border-[var(--enterprise-border)] bg-[var(--enterprise-surface)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </EnterprisePanel>

      <EnterprisePanel title="Privacy workflow" description="Every sensitive control links to consent, export, and audit behavior.">
        <EnterpriseWorkflowList
          items={[
            { label: 'AI personalization', status: 'Opt-out available', tone: 'success' },
            { label: 'Directory visibility', status: 'Scoped', tone: 'info' },
            { label: 'Data export', status: 'DSAR ready', tone: 'success' }
          ]}
        />
      </EnterprisePanel>

      <EnterpriseComplianceStrip
        items={[
          { label: 'FERPA/COPPA language' },
          { label: 'Accessible focus states' },
          { label: 'No third-party additions' }
        ]}
      />
    </EnterpriseSurface>
  );
}
