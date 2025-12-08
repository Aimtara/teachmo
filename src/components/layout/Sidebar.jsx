import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { getNavigationForRole } from '@/config/navigation';

export default function Sidebar({ role = 'parent', currentPageName }) {
  const navigation = React.useMemo(() => getNavigationForRole(role), [role]);

  return (
    <aside className="hidden md:block w-72 border-r border-gray-100 bg-white min-h-screen">
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            T
          </div>
          <div>
            <p className="text-sm text-gray-500">Navigation</p>
            <p className="text-lg font-semibold">{role.charAt(0).toUpperCase() + role.slice(1)}</p>
          </div>
        </div>

        <nav className="space-y-3">
          {navigation.map((section) => {
            const hasChildren = Array.isArray(section.children) && section.children.length > 0;
            const isCurrent = currentPageName && section.page === currentPageName;

            return (
              <div key={section.name} className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                  {section.icon && <section.icon className="w-4 h-4" />}
                  <span>{section.name}</span>
                </div>

                {hasChildren ? (
                  <div className="space-y-1">
                    {section.children.map((child) => {
                      const isChildCurrent = currentPageName && child.page === currentPageName;
                      return (
                        <Link
                          key={child.name}
                          to={createPageUrl(child.page || '')}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                            isChildCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-current={isChildCurrent ? 'page' : undefined}
                        >
                          <child.icon className="w-4 h-4" />
                          <span className="flex-1">{child.name}</span>
                          {child.badge && <Badge variant="secondary">{child.badge}</Badge>}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Link
                    to={createPageUrl(section.page || '')}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                      isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <section.icon className="w-4 h-4" />
                    <span className="flex-1">{section.name}</span>
                    {section.badge && <Badge variant="secondary">{section.badge}</Badge>}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
