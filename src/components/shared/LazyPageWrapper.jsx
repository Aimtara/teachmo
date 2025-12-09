import React, { Suspense, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DashboardSkeleton } from './ImprovedSkeletons';
import GlobalErrorBoundary from './GlobalErrorBoundary';

export function LazyLoadError({ onRetry }) {
  return (
    <div className="p-6 text-center bg-white border border-red-200 rounded-lg shadow-sm">
      <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <p className="font-semibold text-red-800">We couldn't load this content</p>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Please check your connection or try reloading the page.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded"
        style={{ backgroundColor: 'var(--teachmo-sage)' }}
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

export default function LazyPageWrapper({ children, fallback }) {
  const [attempt, setAttempt] = useState(0);

  const handleRetry = () => {
    setAttempt((value) => value + 1);
  };

  return (
    <GlobalErrorBoundary fallback={<LazyLoadError onRetry={handleRetry} />}>
      <Suspense fallback={fallback || <DashboardSkeleton />}>
        <div key={attempt}>
          {children}
        </div>
      </Suspense>
    </GlobalErrorBoundary>
  );
}