import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileNavigation from './MobileNavigation';
import { AuthGuardState, useAuthGuard } from './AuthGuard';
import { createPageUrl } from '@/utils';
import { ROLE_DEFINITIONS } from '@/config/navigation';

export default function Layout({ currentPageName = 'Dashboard', children }) {
  const { user, status, refresh } = useAuthGuard();
  const role = user?.user_type || user?.role || 'parent';

  React.useEffect(() => {
    if (status === 'unauthorized') {
      window.location.pathname = createPageUrl('Landing');
    }
  }, [status]);

  const shouldShowGuard = status === 'loading' || status === 'unauthorized' || status === 'error';

  const defaultPage = ROLE_DEFINITIONS[role]?.defaultPage || 'Dashboard';
  const currentMobilePath = createPageUrl(currentPageName || defaultPage);

  const handleLogout = () => {
    window.location.pathname = createPageUrl('Landing');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <Sidebar role={role} currentPageName={currentPageName} />

        <div className="flex-1 flex flex-col">
          <Header user={user} onLogout={handleLogout} />

          <main className="flex-1 p-4">
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
