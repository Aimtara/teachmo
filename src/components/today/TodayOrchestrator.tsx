import React from 'react';
import { getCurrentMoment } from '@/governance/momentContract';
import { SurfaceBoundary } from '@/components/governance/SurfaceBoundary';

/**
 * Placeholder for a PrimaryCard component. In a full implementation this
 * would accept props to render a single intervention. Here we keep it minimal.
 */
function PrimaryCard({ children }: { children?: React.ReactNode }) {
  return <div className="p-4 border rounded-lg shadow">{children ?? null}</div>;
}

/**
 * selectInterventionForMoment is a stub. In a real implementation this would
 * determine the correct intervention to show for a given moment and user state.
 */
function selectInterventionForMoment(_moment: ReturnType<typeof getCurrentMoment>) {
  // TODO: integrate with intervention selection logic
  return { content: 'Hello, world.' };
}

export function TodayOrchestrator() {
  const moment = getCurrentMoment();
  const intervention = selectInterventionForMoment(moment);

  if (!intervention) return null;

  return (
    <SurfaceBoundary surface="PRIMARY_CARD" moment={moment}>
      <PrimaryCard>{intervention.content}</PrimaryCard>
    </SurfaceBoundary>
  );
}

export default TodayOrchestrator;
