import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LazyPageWrapper from '@/components/shared/LazyPageWrapper';
import { ROUTE_CONFIG, ProtectedRoute } from '@/config/routeConfig';

export default function Pages() {
  const defaultFallback = <p className="p-6 text-gray-600">Loading page...</p>;
  const withLazyWrapper = (children, fallback = defaultFallback) => (
    <LazyPageWrapper fallback={fallback}>{children}</LazyPageWrapper>
  );

  return (
    <BrowserRouter>
      <Suspense fallback={defaultFallback}>
        <Routes>
          {ROUTE_CONFIG.map(({
            key,
            index,
            path,
            Component,
            element,
            allowedRoles,
            requiresAuth,
            fallback,
            wrap = true
          }) => {
            const content = Component ? <Component /> : element;
            const wrappedContent = wrap ? withLazyWrapper(content, fallback) : content;
            const shouldProtect = requiresAuth || allowedRoles;
            const protectedContent = shouldProtect ? (
              <ProtectedRoute allowedRoles={allowedRoles}>{wrappedContent}</ProtectedRoute>
            ) : (
              wrappedContent
            );

            return (
              <Route
                key={key || path}
                {...(index ? { index: true } : { path })}
                element={protectedContent}
              />
            );
          })}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
