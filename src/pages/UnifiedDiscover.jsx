import React from "react";

const UnifiedDiscoverContent = React.lazy(() => import("@/components/discover/PersonalizedDiscoverFeed"));

export default function UnifiedDiscover() {
  return (
    <React.Suspense
      fallback={(
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Loading Discover...</p>
          </div>
        </div>
      )}
    >
      <UnifiedDiscoverContent />
    </React.Suspense>
  );
}
