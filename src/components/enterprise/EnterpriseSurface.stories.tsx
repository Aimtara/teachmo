import type { Meta, StoryObj } from '@storybook/react';
import {
  EnterpriseComplianceStrip,
  EnterpriseFilterBar,
  EnterpriseHeatmap,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from './EnterpriseSurface';

const meta = {
  title: 'Enterprise/Surface Blueprint',
  component: EnterpriseSurface,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'EnterpriseSurface provides the shared command-center shell for role dashboards, onboarding, discover, community, messaging, AI, settings, trust, integrations, moderation, directories, and internal tools.'
      }
    }
  }
} satisfies Meta<typeof EnterpriseSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommandCenter: Story = {
  args: {
    eyebrow: 'Teacher triage',
    title: 'Smart queues and class health',
    description: 'A high-density role surface using enterprise tokens, accessible focus states, and reduced-motion-safe interactions.',
    badges: ['WCAG AA', 'Dark mode', 'High contrast', 'Role-aware'],
    metrics: [
      { label: 'Open messages', value: '7', badge: 'Needs reply', trend: 'down', description: 'Families waiting on teacher responses.' },
      { label: 'Office hours', value: '4', badge: 'Pending', trend: 'flat', description: 'Requests ready for scheduling.' },
      { label: 'Digest drafts', value: '3', badge: 'AI assist', trend: 'up', description: 'Weekly briefs awaiting review.' },
      { label: 'Class health', value: '82%', badge: 'Stable', trend: 'flat', description: 'Average engagement score.' }
    ],
    children: (
      <>
        <EnterpriseFilterBar searchLabel="Search students, families, or queues" filters={['Needs reply', 'Missing work', 'AI nudge']} />
        <div className="grid gap-4 lg:grid-cols-2">
          <EnterprisePanel title="Workflow list" description="Queue items keep status and next action visible.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Avery Chen family', description: 'Reply requested about tomorrow pickup.', status: 'Needs reply', tone: 'warning' },
                { label: 'Science digest', description: 'Weekly update is ready for review.', status: 'AI draft', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
          <EnterprisePanel title="Heatmap" description="Visual risk scan for high-density dashboards.">
            <EnterpriseHeatmap
              title="Class health heatmap"
              rows={[
                { label: 'Math', values: [92, 74, 51, 83, 66] },
                { label: 'Science', values: [61, 47, 88, 79, 42] }
              ]}
            />
          </EnterprisePanel>
        </div>
        <EnterpriseComplianceStrip
          items={[
            { label: 'Privacy', description: 'Sensitive context stays scoped to the user role.' },
            { label: 'Accessibility', description: 'Interactive states use shared focus tokens.' },
            { label: 'Performance', description: 'Reusable sections support lazy route bundles.' }
          ]}
        />
      </>
    )
  }
};

export const HighContrast: Story = {
  render: (args) => (
    <div className="tm-high-contrast">
      <EnterpriseSurface {...args} />
    </div>
  ),
  args: CommandCenter.args
};
