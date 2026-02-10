import React from 'react';
import { getCurrentMoment } from '@/governance/momentContract';
import { SurfaceBoundary } from '@/components/governance/SurfaceBoundary';
import WeeklyBriefCard from '@/components/dashboard/WeeklyBriefCard';
import DailyTipCard from '@/components/dashboard/DailyTipCard';

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
  if (moment.id === 'morning') {
    if (isMonday) {
      // Monday Morning -> High cognitive load protection -> Weekly Brief
      intervention = <WeeklyBriefCard />;
    } else {
      // Regular Morning -> Quick win -> Daily Tip
      intervention = <DailyTipCard />;
    }
  } else if (moment.id === 'midday') {
    // Midday -> Allow more exploration (Placeholder for now)
    intervention = <div className="p-4 text-center text-gray-500">Explore activities for the afternoon</div>;
  }

  // Fallback if no specific intervention is matched
  if (!intervention) {
    return null;
  }

  return (
    <SurfaceBoundary surface="PRIMARY_CARD" moment={moment}>
      <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {intervention}
      </div>
    </SurfaceBoundary>
  );
}

export default TodayOrchestrator;
