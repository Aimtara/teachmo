import React from 'react';
import LazyPageWrapper from './LazyPageWrapper';

// Helper to create lazy-loaded routes with error boundaries
export const createLazyRoute = (importFn, fallback = null) => {
  const LazyComponent = React.lazy(importFn);

  return (props) => (
    <LazyPageWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyPageWrapper>
  );
};

// Preload a component (useful for predictive loading)
export const preloadRoute = (importFn) => {
  const LazyComponent = React.lazy(importFn);
  // Trigger the import but don't wait for it
  importFn().catch((error) => {
    console.error('Failed to preload route:', error);
  });
  return LazyComponent;
};