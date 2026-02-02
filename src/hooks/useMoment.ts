import { useEffect, useState } from 'react';
import { MomentContract, MomentId, getCurrentMoment } from '@/governance/momentContract';

export const useMoment = () => {
  const [currentMomentId] = useState<MomentId>(() => getCurrentMoment());
  const currentContract = MomentContract[currentMomentId];

  const isSurfaceAllowed = (surface: string) => {
    if (currentContract.allowedSurfaces?.length) {
      return currentContract.allowedSurfaces.includes(surface);
    }
    return true;
  };

  return {
    moment: currentMomentId,
    config: currentContract,
    isSurfaceAllowed
  };
};
