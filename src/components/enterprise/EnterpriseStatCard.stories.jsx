import { EnterpriseBadge, EnterpriseStatCard } from './index';

export default {
  title: 'Enterprise/Design System',
  parameters: {
    docs: {
      description: {
        component:
          'Teachmo enterprise tokens, accessible badges, stat cards, and motion primitives for command-center dashboards.'
      }
    }
  }
};

export function TokensAndStatCards() {
  return (
    <div className="space-y-6 bg-[var(--enterprise-bg)] p-6 text-[var(--enterprise-foreground)]">
      <div className="flex flex-wrap gap-2">
        <EnterpriseBadge variant="info">Teachmo Blue</EnterpriseBadge>
        <EnterpriseBadge variant="success">Leaf Green</EnterpriseBadge>
        <EnterpriseBadge variant="warning">Sunrise Gold</EnterpriseBadge>
        <EnterpriseBadge variant="danger">Coral</EnterpriseBadge>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <EnterpriseStatCard label="Queued approvals" value="18" badge="Needs review" trend="flat" />
        <EnterpriseStatCard label="Healthy tenants" value="96%" badge="SLO" badgeVariant="success" trend="up" />
        <EnterpriseStatCard label="Policy drift" value="3" badge="Security" badgeVariant="danger" trend="down" />
      </div>
    </div>
  );
}

export function HighContrastMode() {
  return (
    <div className="tm-high-contrast space-y-4 bg-[var(--enterprise-bg)] p-6 text-[var(--enterprise-foreground)]">
      <EnterpriseStatCard label="Contrast state" value="AA+" badge="High contrast" badgeVariant="warning" trend="up" />
      <p className="text-sm">Focus rings, borders, and status color tokens remain explicit in high-contrast mode.</p>
    </div>
  );
}
