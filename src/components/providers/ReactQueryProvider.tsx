import type { ReactNode } from 'react';

type ReactQueryProviderProps = {
  children: ReactNode;
};

// Simple provider that just passes children through
// This maintains compatibility while removing React Query dependency
export const ReactQueryProvider = ({ children }: ReactQueryProviderProps) => {
  return <>{children}</>;
};

// Export a dummy queryClient for compatibility
export const queryClient = null;
