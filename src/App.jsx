import { NhostProvider, NhostReactProvider } from '@nhost/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Pages from './pages/index.jsx';
import { nhost } from './lib/nhostClient.js';
import { queryClient } from './lib/queryClient.js';
import { Toaster } from './components/ui/toaster';
import { UltraMinimalToast } from './components/shared/UltraMinimalToast.jsx';

function App() {
  return (
    <NhostProvider nhost={nhost}>
      <NhostReactProvider nhost={nhost}>
        <QueryClientProvider client={queryClient}>
          <UltraMinimalToast />
          <Toaster />
          <UltraMinimalToast />
          <Pages />
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
      </NhostReactProvider>
    </NhostProvider>
  );
}

export default App;
