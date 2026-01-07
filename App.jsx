import { NhostProvider, NhostReactProvider } from '@nhost/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Pages from './pages/index.jsx';
import { nhost } from './lib/nhostClient.js';
import UltraMinimalToast from './components/shared/UltraMinimalToast';
import { Toaster } from './components/ui/toaster';
import GlobalErrorBoundary from './components/shared/GlobalErrorBoundary';

// Keep this outside of the component so it doesn't get recreated on every render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    },
    mutations: {
      retry: 0
    }
  }
});

function App() {
  return (
    <NhostProvider nhost={nhost}>
      <NhostReactProvider nhost={nhost}>
        <QueryClientProvider client={queryClient}>
          <GlobalErrorBoundary>
            <Pages />
          </GlobalErrorBoundary>
          {/* Required for legacy Base44 UI components that call ultraMinimalToast() */}
          <UltraMinimalToast />
          {/* Shadcn-style toasts for components using useToast() */}
          <Toaster />
        </QueryClientProvider>
      </NhostReactProvider>
    </NhostProvider>
  );
}

export default App;
