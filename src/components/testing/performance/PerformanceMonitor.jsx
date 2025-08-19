import React, { useEffect, useRef } from 'react';
import { render } from '@testing-library/react';

export const PerformanceMonitor = ({ 
  children, 
  componentName = 'Component',
  onMetric = () => {},
  threshold = 16 // 60fps threshold
}) => {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(null);
  const lastRenderTimeRef = useRef(null);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    return () => {
      const unmountTime = performance.now();
      const totalTime = unmountTime - mountTimeRef.current;
      onMetric({
        type: 'componentLifetime',
        componentName,
        duration: totalTime,
        renderCount: renderCountRef.current
      });
    };
  }, [componentName, onMetric]);

  useEffect(() => {
    renderCountRef.current++;
    const renderTime = performance.now();
    
    if (lastRenderTimeRef.current) {
      const renderDuration = renderTime - lastRenderTimeRef.current;
      if (renderDuration > threshold) {
        onMetric({
          type: 'slowRender',
          componentName,
          duration: renderDuration,
          renderCount: renderCountRef.current
        });
      }
    }
    
    lastRenderTimeRef.current = renderTime;
  });

  return children;
};

export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => (
    <PerformanceMonitor componentName={componentName}>
      <WrappedComponent {...props} ref={ref} />
    </PerformanceMonitor>
  ));
};

// Performance testing utilities
export const performanceTestUtils = {
  measureRenderTime: async (component) => {
    const start = performance.now();
    render(component);
    const end = performance.now();
    return end - start;
  },

  measureMemoryUsage: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  },

  measureBundleSize: async (componentPath) => {
    try {
      const module = await import(componentPath);
      return JSON.stringify(module).length;
    } catch (error) {
      console.warn(`Could not measure bundle size for ${componentPath}`, error);
      return null;
    }
  },
};