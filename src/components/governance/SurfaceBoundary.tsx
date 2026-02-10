import React from 'react';
import { getCurrentMoment, MomentContract } from '@/governance/momentContract';
import { SurfaceType } from '@/governance/surfaces';
import { logGovernanceEvent } from '@/governance/events';

interface SurfaceBoundaryProps {
  surface: SurfaceType;
  /** Optionally override the moment (useful for testing) */
  moment?: ReturnType<typeof getCurrentMoment>;
  children: React.ReactNode;
}

/**
 * SurfaceBoundary enforces the Moment Contract for individual surfaces.
 * If a surface is not allowed in the current moment, it will not render and an
 * internal governance event will be logged.
 */
export function SurfaceBoundary({ surface, moment, children }: SurfaceBoundaryProps) {
  const activeMoment = moment ?? getCurrentMoment();
  const rules = MomentContract[activeMoment];
  if (!rules.allowedSurfaces.includes(surface)) {
    logGovernanceEvent('SURFACE_BLOCKED', { surface, moment: activeMoment });
    return null;
  }
  return <>{children}</>;
}

export default SurfaceBoundary;
