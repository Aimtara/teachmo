export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get the base URL for LTI callbacks.
 * 
 * Priority:
 * 1. If VITE_LTI_BASE_URL is set, use it explicitly (for deployments with separate API domains)
 * 2. If API_BASE_URL is absolute (starts with http), extract the origin
 * 3. Otherwise, construct from current window.location.origin (for same-domain deployments)
 * 
 * This ensures LTI URLs are always absolute and point to where the API is actually deployed,
 * whether behind a reverse proxy or on a separate domain.
 */
function getLtiBaseUrl() {
  // Explicit override for complex deployment scenarios
  if (import.meta.env.VITE_LTI_BASE_URL) {
    return import.meta.env.VITE_LTI_BASE_URL;
  }
  
  // If API_BASE_URL is absolute, extract origin
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      const url = new URL(API_BASE_URL);
      return url.origin;
    } catch {
      // Fall through to window.location.origin if URL parsing fails
    }
  }
  
  // For relative API_BASE_URL, use current origin (requires browser context)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR/build-time contexts
  return 'https://api.teachmo.com';
}

// LTI configuration URLs
// These are composed from API_BASE_URL to ensure they point to the same backend
// The backend mounts the LTI router at /api/lti (see backend/app.js line 113)
export const LTI_BASE_URL = getLtiBaseUrl();
export const LTI_LAUNCH_URL = `${LTI_BASE_URL}/api/lti/launch`;
export const LTI_JWKS_URL = `${LTI_BASE_URL}/.well-known/jwks.json`;

export const getApiBaseUrl = () => API_BASE_URL;
