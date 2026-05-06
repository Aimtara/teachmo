import { cn } from '@/lib/utils';

const variantClasses = {
  neutral: 'border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] text-[var(--enterprise-foreground)]',
  info: 'border-[color-mix(in_srgb,var(--enterprise-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--enterprise-primary)_12%,transparent)] text-[var(--enterprise-primary)]',
  success: 'border-[color-mix(in_srgb,var(--enterprise-success)_38%,transparent)] bg-[color-mix(in_srgb,var(--enterprise-success)_14%,transparent)] text-[var(--enterprise-success)]',
  warning: 'border-[color-mix(in_srgb,var(--enterprise-warning)_48%,transparent)] bg-[color-mix(in_srgb,var(--enterprise-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--enterprise-warning)_72%,#4A3200)]',
  danger: 'border-[color-mix(in_srgb,var(--enterprise-danger)_42%,transparent)] bg-[color-mix(in_srgb,var(--enterprise-danger)_14%,transparent)] text-[var(--enterprise-danger)]'
};

export function EnterpriseBadge({ className, children, variant = 'neutral', pulse = false, ...props }) {
  return (
    <span
      className={cn(
        'enterprise-motion enterprise-focus inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        variantClasses[variant] ?? variantClasses.neutral,
        pulse && 'after:h-1.5 after:w-1.5 after:rounded-full after:bg-current after:content-[""] after:motion-safe:animate-pulse',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
