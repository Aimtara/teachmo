import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnterpriseBadge } from './EnterpriseBadge';

const trendIcons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus
};

const trendVariant = {
  up: 'success',
  down: 'danger',
  flat: 'neutral'
};

export function EnterpriseStatCard({
  label,
  value,
  badge,
  badgeVariant = 'info',
  trend = 'flat',
  description,
  className
}) {
  const TrendIcon = trendIcons[trend] ?? Minus;

  return (
    <article
      className={cn(
        'enterprise-motion rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-[var(--enterprise-shadow)]',
        className
      )}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--enterprise-muted)]">{label}</p>
        {badge ? <EnterpriseBadge variant={badgeVariant}>{badge}</EnterpriseBadge> : null}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-heading text-3xl font-semibold tracking-tight text-[var(--enterprise-foreground)]">
          {value}
        </p>
        <EnterpriseBadge variant={trendVariant[trend] ?? 'neutral'} aria-label={`Trend ${trend}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {trend}
        </EnterpriseBadge>
      </div>
      {description ? <p className="mt-3 text-sm text-[var(--enterprise-muted)]">{description}</p> : null}
    </article>
  );
}
