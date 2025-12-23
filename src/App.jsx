import { NhostProvider, NhostReactProvider } from '@nhost/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Pages from './pages/index.jsx';
import { nhost } from './lib/nhostClient.js';
import { queryClient } from './lib/queryClient.js';
import { Toaster } from './components/ui/toaster';
import { UltraMinimalToast } from './components/shared/UltraMinimalToast.jsx';
import { WebSocketProvider } from './providers/WebSocketProvider';

function App() {
  return (
    <WebSocketProvider>
      <NhostProvider nhost={nhost}>
        <NhostReactProvider nhost={nhost}>
          <QueryClientProvider client={queryClient}>
            <Pages />
            {/* Required for legacy Base44 UI components that call ultraMinimalToast() */}
            <UltraMinimalToast />
            {/* Shadcn-style toasts for components using useToast() */}
            <Toaster />
            {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
          </QueryClientProvider>
        </NhostReactProvider>
      </NhostProvider>
    </WebSocketProvider>
  );
}

export default App;
