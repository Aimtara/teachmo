/**
 * Navigation Helpers - GitHub migration-friendly version
 *
 * Goals:
 * - Keep Base44 call-sites working (navigateToDashboard(user, navigate))
 * - Avoid Base44 security/permissions dependency
 * - Use GitHub's role routing (getDefaultPathForRole)
 */

import { getDefaultPathForRole } from "@/hooks/useUserRole";
import { createPageUrl } from "@/utils";
import { deriveRole } from "@/utils/roleUtils";

export { createPageUrl };

export function navigateToDashboard(user, navigate) {
  if (!user) {
    const url = createPageUrl("Landing");
    if (navigate) navigate(url, { replace: true });
    else window.location.href = url;
    return;
  }

  const role = deriveRole(user);
  const url = getDefaultPathForRole(role);

  if (navigate) navigate(url, { replace: true });
  else window.location.href = url;
}

export function getDashboardUrl(user) {
  if (!user) return createPageUrl("Landing");
  return getDefaultPathForRole(deriveRole(user));
}

export function redirectToDashboard(user) {
  window.location.href = getDashboardUrl(user);
}

export default {
  navigateToDashboard,
  getDashboardUrl,
  redirectToDashboard,
  createPageUrl
};
