import { render, screen } from '@testing-library/react';
import {
  EnterpriseComplianceStrip,
  EnterpriseFilterBar,
  EnterpriseHeatmap,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '../EnterpriseSurface';

describe('EnterpriseSurface', () => {
  it('renders accessible enterprise shell content, metrics, filters, and compliance items', () => {
    render(
      <EnterpriseSurface
        eyebrow="Teacher triage"
        title="Smart queues"
        description="Role-aware command-center surface."
        badges={['WCAG AA', 'Dark mode']}
        metrics={[
          { label: 'Open messages', value: '7', badge: 'Needs reply', trend: 'down', description: 'Families waiting.' },
          { label: 'Class health', value: '82%', badge: 'Stable', trend: 'flat', description: 'Engagement score.' }
        ]}
      >
        <EnterpriseFilterBar searchLabel="Search queues" filters={['Needs reply', 'AI nudge']} />
        <EnterprisePanel title="Workflow list">
          <EnterpriseWorkflowList
            items={[
              { label: 'Avery Chen family', description: 'Reply requested.', status: 'Needs reply', tone: 'warning' }
            ]}
          />
        </EnterprisePanel>
        <EnterpriseHeatmap title="Class health heatmap" rows={[{ label: 'Math', values: [92, 74, 51, 83, 66] }]} />
        <EnterpriseComplianceStrip items={[{ label: 'Privacy', description: 'Sensitive context stays scoped.' }]} />
      </EnterpriseSurface>
    );

    expect(screen.getByRole('main')).toHaveTextContent('Smart queues');
    expect(screen.getByLabelText('Surface standards')).toHaveTextContent('WCAG AA');
    expect(screen.getByLabelText('Open messages: 7')).toBeInTheDocument();
    expect(screen.getByLabelText('Search queues')).toBeInTheDocument();
    expect(screen.getByLabelText('Quick filters')).toHaveTextContent('Needs reply');
    expect(screen.getByLabelText('Class health heatmap')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });
});
