import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import LazyPageWrapper from './LazyPageWrapper';
import { createLogger } from '@/utils/logger';

const logger = createLogger('lazy-route');

type ImportFunction<TProps extends object> = () => Promise<{ default: ComponentType<TProps> }>;

export const createLazyRoute = <TProps extends object>(
  importFn: ImportFunction<TProps>,
  fallback: ReactNode = null,
) => {
  const LazyComponent = lazy(importFn);

  return (props: TProps) => (
    <LazyPageWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyPageWrapper>
  );
};

export const preloadRoute = <TProps extends object>(
  importFn: ImportFunction<TProps>,
): LazyExoticComponent<ComponentType<TProps>> => {
  const LazyComponent = lazy(importFn);
  importFn().catch((error: unknown) => {
    logger.error('Failed to preload route', error);
  });
  return LazyComponent;
};
