import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BreadcrumbNavigation({ items = [] }) {
  if (items.length === 0) {
    return null;
  }

  const allItems = [
    { label: 'Home', href: createPageUrl('Dashboard'), icon: Home },
    ...items,
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-1 sm:space-x-2 text-sm text-gray-500">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 sm:mx-2 flex-shrink-0" />
            )}
            
            {item.href ? (
              <Link
                to={item.href}
                className="flex items-center gap-2 transition-colors hover:text-gray-800"
                aria-current={index === allItems.length - 1 ? 'page' : undefined}
              >
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}