// Use only the modern NhostProvider. The NhostReactProvider has been deprecated.
import { NhostProvider } from '@nhost/react';
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
import LiveSupportWidget from './components/support/LiveSupportWidget';
import FeatureFlagProvider from './providers/FeatureFlagProvider.jsx';
import { I18nProvider } from './components/shared/InternationalizationProvider';
import GlobalErrorBoundary from './components/shared/GlobalErrorBoundary';
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

  return (
    <GlobalErrorBoundary>
      {/* NhostProvider is now anchored at the absolute top so it never remounts! */}
      <NhostProvider nhost={nhost}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider enabled={featureI18nEnabled}>
            <WebSocketProvider>
              <TypingIndicatorProvider>
                <TenantProvider>
                  <TenantBrandingProvider>
                    <FeatureFlagProvider>
                      <Pages />
                      <LiveSupportWidget />
                    </FeatureFlagProvider>
                  </TenantBrandingProvider>
                </TenantProvider>
                <UltraMinimalToast />
                <Toaster />
                <HotToaster position="top-right" />
                {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
              </TypingIndicatorProvider>
            </WebSocketProvider>
          </I18nProvider>
        </QueryClientProvider>
      </NhostProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
