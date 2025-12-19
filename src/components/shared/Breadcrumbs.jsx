import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { createPageUrl, ROUTE_MAP } from "@/utils";
import { getDefaultPathForRole } from "@/hooks/useUserRole";
import { deriveRole } from "@/utils/roleUtils";

export default function Breadcrumbs({ items, segments }) {
  const crumbItems = items && items.length ? items : segments || [];
  if (!crumbItems || crumbItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-gray-600">
        {crumbItems.map((item, index) => {
          const isLast = index === crumbItems.length - 1;
          const isLink = Boolean(item.href) && !isLast;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />}

              {isLink ? (
                <Link to={item.href} className="hover:text-blue-600 transition-colors">
                  {index === 0 && <Home className="w-4 h-4 mr-1 inline" aria-hidden="true" />}
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-gray-900" : ""} aria-current={isLast ? "page" : undefined}>
                  {index === 0 && item.href && <Home className="w-4 h-4 mr-1 inline" aria-hidden="true" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Lightweight breadcrumb generator for GitHub migration.
 * - Uses ROUTE_MAP / createPageUrl
 * - Avoids Base44's security/permissions dependency
 */
export function generateBreadcrumbs(currentPageName, user = null) {
  const role = deriveRole(user);
  const homeHref = getDefaultPathForRole(role);

  const homeLabelMap = {
    parent: "Home",
    teacher: "Home",
    partner: "Partner",
    system_admin: "Admin",
    school_admin: "Admin",
    district_admin: "Admin"
  };

  const crumbs = [
    {
      label: homeLabelMap[role] || "Home",
      href: homeHref
    }
  ];

  if (!currentPageName) return crumbs;

  const route = ROUTE_MAP[currentPageName];
  const label = currentPageName.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").trim();

  crumbs.push({
    label: currentPageName === "UnifiedDiscover" ? "Discover" : label,
    href: route ? createPageUrl(currentPageName) : null
  });

  return crumbs;
}
