import React, { Suspense, useEffect, useMemo, useCallback } from 'react';
import { PerformanceMonitor } from '../testing/performance/PerformanceMonitor';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';
import { LazyLoadError } from '@/components/shared/LazyPageWrapper';
import { createLogger } from '@/utils/logger';

const logger = createLogger('performance-optimizer');
const isDevelopment =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

// Bundle size analyzer
export const analyzeBundleSize = () => {
  const getComponentSize = (component) => {
    try {
      return JSON.stringify(component).length;
    } catch (error) {
      return 0;
    }
  };

  const analyzeBundle = () => {
    if (!isDevelopment) return {};
    const components = {};
    
    // This would need to be integrated with webpack-bundle-analyzer
    // or similar tooling for production use
    performance.mark('bundle-analysis-start');
    
    // Measure current bundle
    if (typeof window !== 'undefined' && window.__webpack_require__) {
      const modules = window.__webpack_require__.cache;
      Object.keys(modules).forEach(key => {
        const module = modules[key];
        if (module.exports) {
          components[key] = getComponentSize(module.exports);
        }
      });
    }
    
    performance.mark('bundle-analysis-end');
    performance.measure('bundle-analysis', 'bundle-analysis-start', 'bundle-analysis-end');
    
    return components;
  };

  return { analyzeBundle };
};

// Image optimization HOC
export const withImageOptimization = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const optimizedProps = useMemo(() => {
      const newProps = { ...props };
      
      // Add loading and decoding attributes for images
      if (props.src) {
        newProps.loading = newProps.loading || 'lazy';
        newProps.decoding = newProps.decoding || 'async';
      }
      
      return newProps;
    }, [props]);

    return <WrappedComponent {...optimizedProps} ref={ref} />;
  });
};

// Virtualization for large lists
export const VirtualizedList = ({ 
  items, 
  itemHeight = 50, 
  containerHeight = 400,
  renderItem,
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerRef, setContainerRef] = React.useState(null);

  const visibleItems = useMemo(() => {
    if (!items.length) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={setContainerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Memoization utilities
export const useDeepMemo = (factory, deps) => {
  const ref = React.useRef();
  
  if (!ref.current || !areEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }
  
  return ref.current.value;
};

const areEqual = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// Performance-aware component wrapper
export const PerformanceAware = ({ 
  children, 
  componentName, 
  threshold = 16,
  enableProfiling = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development' 
}) => {
  if (!enableProfiling) {
    return children;
  }

  return (
    <PerformanceMonitor
      componentName={componentName}
      threshold={threshold}
      onMetric={(metric) => {
        if (metric.type === 'slowRender' && isDevelopment) {
          logger.warn(`Slow render detected in ${metric.componentName}: ${metric.duration}ms`);
        }
      }}
    >
      {children}
    </PerformanceMonitor>
  );
};

// Code splitting utilities
export const createLazyComponent = (importFn, fallback = <div>Loading...</div>) => {
  const LazyComponent = React.lazy(importFn);

  return React.forwardRef((props, ref) => (
    <GlobalErrorBoundary fallback={<LazyLoadError onRetry={() => window.location.reload()} />}>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </GlobalErrorBoundary>
  ));
};

// Resource prefetching
export const usePrefetch = () => {
  const prefetchedResources = React.useRef(new Set());

  const prefetch = useCallback((resource) => {
    if (prefetchedResources.current.has(resource)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = resource;
    document.head.appendChild(link);
    
    prefetchedResources.current.add(resource);
  }, []);

  const preload = useCallback((resource, type = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = type;
    document.head.appendChild(link);
  }, []);

  return { prefetch, preload };
};

// Performance monitoring hook
export const usePerformanceMonitoring = (componentName) => {
  const renderCount = React.useRef(0);
  const mountTime = React.useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
  });

  useEffect(() => {
    return () => {
      if (!isDevelopment) return;
      const unmountTime = performance.now();
      const totalTime = unmountTime - mountTime.current;

      logger.debug(`${componentName} performance:`, {
        totalLifetime: totalTime,
        totalRenders: renderCount.current,
        avgRenderTime: totalTime / renderCount.current,
      });
    };
  }, [componentName]);

  const measureOperation = useCallback((operationName, operation) => {
    const start = performance.now();
    const result = operation();
    const end = performance.now();
    
    if (isDevelopment) {
      logger.debug(`${componentName} - ${operationName}: ${end - start}ms`);
    }
    return result;
  }, [componentName]);

  return { measureOperation };
};

// Memory leak detection
export const useMemoryLeakDetection = (componentName) => {
  const subscriptions = React.useRef([]);
  const timers = React.useRef([]);

  const addSubscription = useCallback((cleanup) => {
    subscriptions.current.push(cleanup);
  }, []);

  const addTimer = useCallback((timerId) => {
    timers.current.push(timerId);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup all subscriptions
      subscriptions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          if (isDevelopment) {
            logger.warn(`Cleanup error in ${componentName}:`, error);
          }
        }
      });

      // Clear all timers
      timers.current.forEach(timerId => {
        clearTimeout(timerId);
        clearInterval(timerId);
      });

      // Log potential memory leak indicators
      if (isDevelopment && subscriptions.current.length > 10) {
        logger.warn(`${componentName} had ${subscriptions.current.length} subscriptions - potential memory leak`);
      }
    };
  }, [componentName]);

  return { addSubscription, addTimer };
};
