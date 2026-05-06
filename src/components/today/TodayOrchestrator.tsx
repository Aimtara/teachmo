import React from 'react';
import { getCurrentMoment } from '@/governance/momentContract';
import { SurfaceBoundary } from '@/components/governance/SurfaceBoundary';
import WeeklyBriefCard from '@/components/dashboard/WeeklyBriefCard';
import DailyTipCard from '@/components/dashboard/DailyTipCard';
import { EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';

/**
 * Orchestrates the "Today" view based on the user's current moment/context.
 * Enforces the "One Primary Action" rule.
 */
export function TodayOrchestrator() {
  const moment = getCurrentMoment();
  const date = new Date();
  const isMonday = date.getDay() === 1;

  let intervention: React.ReactNode = null;

  // Decision Logic: Select the highest priority intervention for the moment
  if (moment === 'morning') {
    if (isMonday) {
      // Monday Morning -> High cognitive load protection -> Weekly Brief
      intervention = <WeeklyBriefCard />;
    } else {
      // Regular Morning -> Quick win -> Daily Tip
      intervention = <DailyTipCard />;
    }
  } else if (moment === 'midday') {
    // Midday -> Allow more exploration (Placeholder for now)
    intervention = <div className="p-4 text-center text-gray-500">Explore activities for the afternoon</div>;
  } else {
    intervention = <DailyTipCard />;
  }

  return (
    <SurfaceBoundary surface="PRIMARY_CARD" moment={moment}>
      <EnterpriseSurface
        eyebrow="Today"
        title="Three-card family focus"
        description="Today keeps the default parent experience constrained to a weekly brief, one primary action, and a next-up summary."
        badges={['Three-card rule', 'Weekly brief', 'One primary action', 'Reduced cognitive load']}
        metrics={[
          { label: 'Primary cards', value: '3', badge: 'Limit', trend: 'down', description: 'The default view never asks families to scan more than three cards.' },
          { label: 'Current moment', value: moment.replace('_', ' '), badge: 'Adaptive', trend: 'flat', description: 'The intervention adapts to the family moment contract.' },
          { label: 'Weekly brief', value: isMonday ? 'Pinned' : 'Available', badge: 'Snapshot', trend: 'flat', description: 'Families can orient before taking action.' },
          { label: 'Explore', value: 'Unified', badge: 'Calm', trend: 'up', description: 'Activities, events, and library content stay consolidated.' }
        ]}
      >
        <section className="grid gap-4 lg:grid-cols-3" aria-label="Today three-card view">
          <EnterprisePanel title="Weekly family brief" description="A stable weekly snapshot anchors the day.">
            <WeeklyBriefCard />
          </EnterprisePanel>
          <EnterprisePanel title="Primary action" description="Only the highest-value intervention is shown.">
            {intervention}
          </EnterprisePanel>
          <EnterprisePanel title="Next up" description="One summary replaces scattered activity, event, and message cards.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Explore recommendation', description: 'AI-filtered activity matched to age and school context.', status: 'Saved', tone: 'success' },
                { label: 'Teacher message', description: 'Draft reply available with privacy-safe summary.', status: 'Optional', tone: 'info' },
                { label: 'Upcoming event', description: 'Calendar conflict checks before the family commits.', status: 'Tomorrow', tone: 'warning' }
              ]}
            />
          </EnterprisePanel>
        </section>
      </EnterpriseSurface>
    </SurfaceBoundary>
  );
}

export default TodayOrchestrator;
