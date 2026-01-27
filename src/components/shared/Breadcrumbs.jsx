import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTE_MAP } from '@/config/navigation';

const ROUTE_ENTRIES = Object.entries(ROUTE_MAP || {}).map(([name, path]) => ({
  name,
  path,
  normalizedName: name?.toLowerCase(),
  normalizedPath: path?.toLowerCase()
}));

const formatLabel = (value = '') =>
  value
    .replace(/^\//, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const resolveFromRoutes = (segment = '') => {
  const normalized = segment.toLowerCase();
  const direct = ROUTE_ENTRIES.find(
    ({ normalizedName, normalizedPath }) =>
      normalizedName === normalized || normalizedPath === normalized || normalizedPath === `/${normalized}`
  );

  if (direct) {
    return {
      label: formatLabel(direct.name),
      href: direct.path
    };
  }

  return {
    label: formatLabel(segment),
    href: `/${segment.replace(/^\//, '')}`
  };
};

const buildItems = (items, segments, pathname) => {
  if (Array.isArray(items) && items.length > 0) return items;
  if (Array.isArray(segments) && segments.length > 0) {
    return segments.map((segment) => (typeof segment === 'string' ? resolveFromRoutes(segment) : segment));
  }

  if (pathname === '/') return [];

  const parts = pathname.split('/').filter(Boolean);
  return parts.map((part, index) => ({
    label: formatLabel(part),
    href: `/${parts.slice(0, index + 1).join('/')}`
  }));
};

export default function Breadcrumbs({ items = [], segments = [] }) {
  const location = useLocation();
  const crumbs = buildItems(items, segments, location.pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-600">
      <ol className="flex items-center gap-1">
        <li className="flex items-center gap-1">
          <Link to="/" className="flex items-center gap-1 text-gray-700 hover:text-gray-900">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((item, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={item.href || item.label} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-gray-400" />
              {isLast ? (
                <span className="text-gray-500">{item.label}</span>
              ) : (
                <Link to={item.href || '#'} className="text-gray-700 hover:text-gray-900">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string
    })
  ),
  segments: PropTypes.arrayOf(PropTypes.string)
};
