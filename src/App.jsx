import { NhostProvider, NhostReactProvider } from '@nhost/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster as HotToaster } from 'react-hot-toast';
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
import { I18nProvider } from './components/shared/InternationalizationProvider';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useStore } from './components/hooks/useStore';
import { isFeatureEnabled } from './utils/featureFlags';

function App() {
  const featureI18nEnabled = useStore((state) => {
    const flags = state.featureFlags ?? {};
    if (Object.prototype.hasOwnProperty.call(flags, 'FEATURE_I18N')) {
      return Boolean(flags.FEATURE_I18N);
    }
    return isFeatureEnabled('FEATURE_I18N');
  });
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

  return (
    <ErrorBoundary>
      <I18nProvider enabled={featureI18nEnabled}>{appContent}</I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
