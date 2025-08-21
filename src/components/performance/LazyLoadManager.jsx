import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const LazyLoadManager = {
  // Page components
  Dashboard: lazy(() => import('@/pages/Dashboard')),
  UnifiedCommunity: lazy(() => import('@/pages/UnifiedCommunity')),
  AIAssistant: lazy(() => import('@/pages/AIAssistant')),
  Calendar: lazy(() => import('@/pages/Calendar')),
  Settings: lazy(() => import('@/pages/Settings')),
  Progress: lazy(() => import('@/pages/Progress')),
  Library: lazy(() => import('@/pages/Library')),
  Messages: lazy(() => import('@/pages/Messages')),
  
  // Component lazy loading
  PostCard: lazy(() => import('@/components/community/PostCard')),
  ActivityCard: lazy(() => import('@/components/activities/ActivityCard')),
  PodCard: lazy(() => import('@/components/pods/PodCard')),
  Leaderboard: lazy(() => import('@/components/community/Leaderboard')),
  AdvancedAIAssistant: lazy(() => import('@/components/ai/AdvancedAIAssistant')),
  
  // Skeletons for different components
  Skeletons: {
    Dashboard: () => (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    ),
    
    PostCard: () => (
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    ),
    
    ActivityCard: () => (
      <div className="space-y-3 p-4 border rounded-lg">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    ),
    
    Leaderboard: () => (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    )
  }
};

// Higher-order component for lazy loading with error boundaries
export const withLazyLoading = (Component, SkeletonComponent) => {
  return function LazyComponent(props) {
    return (
      <Suspense fallback={<SkeletonComponent />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

// Preloader for critical components
export const preloadComponent = (componentName) => {
  if (LazyLoadManager[componentName]) {
    LazyLoadManager[componentName]();
  }
};

// Intersection Observer for lazy loading on scroll
export const useLazyLoad = (ref, callback) => {
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [callback]);
};

export default LazyLoadManager;
