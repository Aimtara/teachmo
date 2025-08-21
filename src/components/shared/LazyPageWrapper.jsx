import React, { Suspense } from 'react';
import { DashboardSkeleton } from './ImprovedSkeletons';

export default function LazyPageWrapper({ page: PageComponent }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {PageComponent ? <PageComponent /> : <DashboardSkeleton />}
    </Suspense>
  );
}