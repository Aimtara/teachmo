import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Bell } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { NotificationsAPI } from '@/api/adapters';

export default function Header({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const roleLabel = user?.user_type || user?.role || 'parent';
  const streak = user?.login_streak ?? 0;

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await User.logout?.();
    onLogout?.();
  };

  React.useEffect(() => {
    if (!user) return undefined;

    let isMounted = true;

    const loadUnread = async () => {
      try {
        const count = await NotificationsAPI.getUnreadCount();
        if (isMounted) setUnreadCount(Number(count) || 0);
      } catch (error) {
        if (import.meta.env?.MODE !== 'production') {
          console.error('Unable to load notification count', error);
        }
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Welcome back</p>
          <p className="text-lg font-semibold text-gray-900">{user?.full_name || 'User'}</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to={createPageUrl('Notifications')}
            className="relative inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] rounded-full bg-emerald-600 px-1.5 text-center text-xs font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold" aria-label="login streak">
            🔥 {streak}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="User menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center font-bold">
                {(user?.full_name || 'U').slice(0, 1)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-100 shadow-lg bg-white z-20" role="menu" aria-label="User menu">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="py-2">
                  <a
                    className="block px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    href={createPageUrl('Profile')}
                    role="menuitem"
                  >
                    Profile & settings
                  </a>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
