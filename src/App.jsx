import { NhostProvider, NhostReactProvider } from '@nhost/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster as HotToaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';
import Pages from './pages/index.jsx';
import { nhost } from './lib/nhostClient';
import { queryClient } from './lib/queryClient.js';
import { Toaster } from './components/ui/toaster';
import { UltraMinimalToast } from './components/shared/UltraMinimalToast.jsx';
import { TypingIndicatorProvider } from './providers/TypingIndicatorProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { TenantProvider } from './contexts/TenantContext';
import { TenantBrandingProvider } from './contexts/TenantBrandingContext';
import FeatureFlagProvider from './providers/FeatureFlagProvider.jsx';
import i18n from './i18n';
import { isFeatureEnabled } from './utils/featureFlags';

function App() {
  const appContent = (
    <WebSocketProvider>
      <TypingIndicatorProvider>
        <NhostProvider nhost={nhost}>
          <NhostReactProvider nhost={nhost}>
            <QueryClientProvider client={queryClient}>
              <TenantProvider>
                <TenantBrandingProvider>
                  <FeatureFlagProvider>
                    <Pages />
                  </FeatureFlagProvider>
                </TenantBrandingProvider>
              </TenantProvider>
              {/* Required for legacy Base44 UI components that call ultraMinimalToast() */}
              <UltraMinimalToast />
              {/* Shadcn-style toasts for components using useToast() */}
              <Toaster />
              <HotToaster position="top-right" />
              {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
            </QueryClientProvider>
          </NhostReactProvider>
        </NhostProvider>
      </TypingIndicatorProvider>
    </WebSocketProvider>
  );

  if (isFeatureEnabled('FEATURE_I18N')) {
    return <I18nextProvider i18n={i18n}>{appContent}</I18nextProvider>;
  }

  return appContent;
}

export default App;
