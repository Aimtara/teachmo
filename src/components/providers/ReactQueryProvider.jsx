import React from 'react';

// Simple provider that just passes children through
// This maintains compatibility while removing React Query dependency
export const ReactQueryProvider = ({ children }) => {
  return <>{children}</>;
};

// Export a dummy queryClient for compatibility
export const queryClient = null;
