import { cn } from "@/lib/utils";
import { ROUTE_MAP, findRouteConfig, resolveRouteName } from "@/config/routes";

export function createPageUrl(pageName: string, params: Record<string, string | number> = {}) {
  const resolvedName = resolveRouteName(pageName);
  const route = findRouteConfig(resolvedName);
  const normalizedName = resolvedName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const basePath = route?.path || `/${normalizedName}`;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => query.append(key, String(value)));

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export { ROUTE_MAP, cn };
