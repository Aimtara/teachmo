import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EnterpriseBadge } from './EnterpriseBadge';
import { EnterpriseStatCard } from './EnterpriseStatCard';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type EnterpriseMetric = {
  label: string;
  value: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  trend?: 'up' | 'down' | 'flat';
  description?: string;
};

export type EnterpriseWorkflowItem = {
  label: string;
  description?: string;
  status?: string;
  tone?: BadgeVariant;
};

export type EnterpriseSurfaceProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badges?: string[];
  actions?: ReactNode;
  metrics?: EnterpriseMetric[];
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function EnterpriseSurface({
  eyebrow = 'Teachmo enterprise',
  title,
  description,
  badges = [],
  actions,
  metrics = [],
  children,
  aside,
  className
}: EnterpriseSurfaceProps) {
  return (
    <main
      className={cn(
        'min-h-screen bg-[var(--enterprise-bg)] px-4 py-6 text-[var(--enterprise-foreground)] sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] shadow-[var(--enterprise-shadow)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--enterprise-muted)]">
                {eyebrow}
              </p>
              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--enterprise-muted)]">{description}</p>
              </div>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="Surface standards">
                  {badges.map((badge) => (
                    <EnterpriseBadge key={badge} variant="info">
                      {badge}
                    </EnterpriseBadge>
                  ))}
                </div>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-start gap-3 lg:justify-end">{actions}</div> : null}
          </div>
          {metrics.length > 0 ? (
            <EnterpriseMetricGrid
              metrics={metrics}
              className="border-t border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_5%,transparent)] p-4 lg:p-6"
            />
          ) : null}
        </section>

        <div className={cn('grid gap-6', aside ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : '')}>
          <div className="min-w-0 space-y-6">{children}</div>
          {aside ? <aside className="space-y-6">{aside}</aside> : null}
        </div>
      </div>
    </main>
  );
}

export function EnterpriseMetricGrid({ metrics, className }: { metrics: EnterpriseMetric[]; className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>
      {metrics.map((metric) => (
        <EnterpriseStatCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

export function EnterprisePanel({
  title,
  description,
  children,
  actions,
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[1.5rem] border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-5 shadow-sm',
        className
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-[var(--enterprise-muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function EnterpriseWorkflowList({ items }: { items: EnterpriseWorkflowItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article
          key={`${item.label}-${item.status ?? 'status'}`}
          className="enterprise-motion rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_4%,transparent)] p-4 hover:-translate-y-0.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{item.label}</h3>
              {item.description ? <p className="mt-1 text-sm text-[var(--enterprise-muted)]">{item.description}</p> : null}
            </div>
            {item.status ? <EnterpriseBadge variant={item.tone ?? 'neutral'}>{item.status}</EnterpriseBadge> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function EnterpriseFilterBar({
  searchLabel = 'Search this surface',
  filters
}: {
  searchLabel?: string;
  filters: string[];
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-3">
      <label className="sr-only" htmlFor="enterprise-surface-search">
        {searchLabel}
      </label>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          id="enterprise-surface-search"
          className="enterprise-focus min-h-11 flex-1 rounded-2xl border border-[var(--enterprise-border)] bg-transparent px-4 text-sm"
          placeholder={searchLabel}
          type="search"
        />
        <div className="flex flex-wrap gap-2" aria-label="Quick filters">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className="enterprise-focus enterprise-motion rounded-full border border-[var(--enterprise-border)] px-3 py-2 text-sm font-medium text-[var(--enterprise-muted)] hover:-translate-y-0.5 hover:text-[var(--enterprise-foreground)]"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseHeatmap({
  title,
  rows
}: {
  title: string;
  rows: Array<{ label: string; values: number[] }>;
}) {
  return (
    <div aria-label={title} className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[8rem_1fr] items-center gap-3">
          <span className="text-sm font-medium text-[var(--enterprise-muted)]">{row.label}</span>
          <div className="grid grid-cols-5 gap-2" role="list" aria-label={`${row.label} health levels`}>
            {row.values.map((value, index) => (
              <span
                key={`${row.label}-${index}`}
                role="listitem"
                aria-label={`${row.label} segment ${index + 1}: ${value}%`}
                className="h-9 rounded-xl border border-[var(--enterprise-border)]"
                style={{
                  background: `color-mix(in srgb, var(--enterprise-${
                    value > 75 ? 'success' : value > 45 ? 'warning' : 'danger'
                  }) ${Math.max(value, 28)}%, var(--enterprise-surface))`
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseComplianceStrip({ items }: { items: EnterpriseWorkflowItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-success)_7%,transparent)] p-4"
        >
          <p className="text-sm font-semibold">{item.label}</p>
          {item.description ? <p className="mt-1 text-xs leading-5 text-[var(--enterprise-muted)]">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
