import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Bell } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { NotificationsAPI } from '@/api/adapters';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { getDefaultPathForRole, normalizeRole } from '@/config/rbac';
import { saveActiveRole } from '@/lib/activeRole';

function formatRoleLabel(role) {
  return role.replaceAll('_', ' ');
}

export default function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const menuId = React.useId();
  const menuRef = React.useRef(null);

  const availableRoles = React.useMemo(() => {
    const deduped = new Set(
      [
        ...(Array.isArray(user?.roles) ? user.roles : []),
        user?.defaultRole,
        user?.app_role,
      ].filter(Boolean)
    );
    return Array.from(deduped).map((role) => normalizeRole(role));
  }, [user?.roles, user?.defaultRole, user?.app_role]);

  const roleLabel = normalizeRole(user?.app_role || user?.role || 'parent');
  const streak = user?.login_streak ?? 0;

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await onLogout?.();
  };

  const handleRoleSwitch = (nextRole) => {
    const normalizedRole = normalizeRole(nextRole);
    saveActiveRole(normalizedRole);
    setIsMenuOpen(false);
    navigate(getDefaultPathForRole(normalizedRole));
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

  React.useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">Welcome back</p>
          <p className="text-lg font-semibold text-gray-900">{user?.full_name || 'User'}</p>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
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

          <div
            className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-sm font-semibold"
            aria-label={`Login streak ${streak} days`}
          >
            🔥 {streak}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="User menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              aria-controls={menuId}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center font-bold">
                {(user?.full_name || 'U').slice(0, 1)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-600 capitalize">{formatRoleLabel(roleLabel)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {isMenuOpen && (
              <div
                id={menuId}
                className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-100 shadow-lg bg-white z-20"
                role="menu"
                aria-label="User menu"
              >
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                {availableRoles.length > 1 && (
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Switch profile</p>
                    <div className="space-y-1">
                      {availableRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          className={`w-full rounded px-2 py-1 text-left text-sm ${
                            role === roleLabel ? 'bg-emerald-50 font-semibold text-emerald-800' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleRoleSwitch(role)}
                        >
                          {formatRoleLabel(role)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
