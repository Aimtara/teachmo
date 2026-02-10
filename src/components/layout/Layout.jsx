import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileNavigation from './MobileNavigation';
import { AuthGuardState, useAuthGuard } from './AuthGuard';
import { createPageUrl } from '@/utils';
import { ROLE_DEFINITIONS } from '@/config/navigation';
import { useSignOut } from '@nhost/react';

export default function Layout({ currentPageName = 'Dashboard', children }) {
  const { user, status, refresh } = useAuthGuard();
  const role = user?.app_role || user?.role || 'parent';
  const { signOut } = useSignOut();

  React.useEffect(() => {
    if (status === 'unauthorized') {
      window.location.pathname = createPageUrl('Login');
    }
  }, [status]);

  const shouldShowGuard = status === 'loading' || status === 'unauthorized' || status === 'error';

  const defaultPage = ROLE_DEFINITIONS[role]?.defaultPage || 'Dashboard';
  const currentMobilePath = createPageUrl(currentPageName || defaultPage);

  const handleLogout = () => {
    signOut().catch(() => {});
    window.location.pathname = createPageUrl('Login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <Sidebar role={role} currentPageName={currentPageName} />

        <div className="flex-1 flex flex-col">
          <Header user={user} onLogout={handleLogout} />

          <main id="main-content" className="flex-1 p-4" tabIndex={-1}>
            {shouldShowGuard ? (
              <AuthGuardState status={status} onRetry={refresh} />
            ) : (
              children
            )}
          </main>

          <Footer />
        </div>
      </div>

      <MobileNavigation
        userRole={role}
        currentPageTitle={currentPageName}
        unreadMessageCount={3}
        currentPath={currentMobilePath}
      />
    </div>
  );
}
