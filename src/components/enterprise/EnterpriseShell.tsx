import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { enterpriseRoles } from '@/design/tokens';
import { EnterpriseBadge } from './EnterpriseBadge';
import { EnterpriseCommandPalette } from './EnterpriseCommandPalette';

const navItems = [
  { label: 'Overview', href: '/admin', mark: 'OV' },
  { label: 'Command Center', href: '/admin/command-center', mark: 'CC' },
  { label: 'Audit Logs', href: '/admin/audit-logs', mark: 'AU' },
  { label: 'SSO Policy', href: '/admin/sso', mark: 'SS' },
  { label: 'AI Governance', href: '/admin/ai-governance', mark: 'AI' },
  { label: 'Analytics', href: '/admin/analytics', mark: 'AN' },
  { label: 'Settings', href: '/admin/tenant-settings', mark: 'SE' }
];

export function EnterpriseShell({
  children,
  commands,
  onCommand,
  role = 'system_admin',
  title = 'Command Center',
  subtitle,
  breadcrumbs = ['Administration', 'Command Center']
}) {
  const [collapsed, setCollapsed] = useState(false);
  const roleConfig = enterpriseRoles[role] ?? enterpriseRoles.system_admin;

  return (
    <div className="min-h-screen bg-[var(--enterprise-bg)] text-[var(--enterprise-foreground)]">
      <div className={cn('grid min-h-screen transition-[grid-template-columns] duration-200', collapsed ? 'lg:grid-cols-[5.25rem_1fr]' : 'lg:grid-cols-[18rem_1fr]')}>
        <aside className="hidden border-r border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-4 lg:block" aria-label="Enterprise navigation">
          <div className="flex items-center justify-between gap-2">
            <div className={cn('min-w-0', collapsed && 'sr-only')}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--enterprise-muted)]">Teachmo</p>
              <p className="font-heading text-lg font-semibold">Enterprise</p>
            </div>
            <button
              className="enterprise-focus enterprise-motion rounded-xl border border-[var(--enterprise-border)] p-2 hover:-translate-y-0.5"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span aria-hidden="true">{collapsed ? '>' : '<'}</span>
            </button>
          </div>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = item.label === 'Command Center';
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    'enterprise-focus enterprise-motion flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:-translate-y-0.5',
                    active
                      ? 'bg-[var(--enterprise-primary)] text-white shadow-[var(--enterprise-shadow)]'
                      : 'text-[var(--enterprise-muted)] hover:bg-[color-mix(in_srgb,var(--enterprise-primary)_8%,transparent)] hover:text-[var(--enterprise-foreground)]'
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current text-[10px]" aria-hidden="true">
                    {item.mark}
                  </span>
                  <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <header className="grid gap-4 xl:grid-cols-[1fr_30rem] xl:items-start">
              <div>
                <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[var(--enterprise-muted)]" aria-label="Breadcrumb">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={crumb} className="flex items-center gap-2">
                      {index > 0 ? <span aria-hidden="true">/</span> : null}
                      <span>{crumb}</span>
                    </span>
                  ))}
                </nav>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                  <EnterpriseBadge variant="success">
                    WCAG AA tokens
                  </EnterpriseBadge>
                </div>
                <p className="mt-2 max-w-3xl text-[var(--enterprise-muted)]">
                  {subtitle ?? roleConfig.mission}
                </p>
              </div>
              <EnterpriseCommandPalette commands={commands} onCommand={onCommand} roleLabel={roleConfig.label} />
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
