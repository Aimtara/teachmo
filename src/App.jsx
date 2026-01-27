// Use only the modern NhostProvider. The NhostReactProvider has been deprecated
// and can cause context issues when nested with NhostProvider. See
// https://docs.nhost.io/reference/deprecated/react/signed-in for details.
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
  const appContent = (
    <WebSocketProvider>
      <TypingIndicatorProvider>
        {/* Wrap the application with NhostProvider once. NhostReactProvider has been removed */}
        <NhostProvider nhost={nhost}>
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
        </NhostProvider>
      </TypingIndicatorProvider>
    </WebSocketProvider>
  );

  return (
    <GlobalErrorBoundary>
      <I18nProvider enabled={featureI18nEnabled}>{appContent}</I18nProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
