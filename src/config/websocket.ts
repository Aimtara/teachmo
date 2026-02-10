const DEFAULT_WS_PATH = '/ws';

function resolveBaseUrl(input?: string) {
  if (!input) return null;
  if (input.startsWith('http://') || input.startsWith('https://')) return new URL(input);
  return null;
}

function joinPaths(basePath: string, suffix: string) {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (!normalizedBase || normalizedBase === '/') return normalizedSuffix;
  return `${normalizedBase}${normalizedSuffix}`;
}

export function getWebSocketUrl(): string {
  // 1. Trust the explicit environment variable if set (Best for Production)
  const explicitUrl = import.meta.env.VITE_WS_URL;
  if (explicitUrl) return explicitUrl;

  const apiBaseUrl = resolveBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (apiBaseUrl) {
    const protocol = apiBaseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPath = joinPaths(apiBaseUrl.pathname, DEFAULT_WS_PATH);
    return `${protocol}//${apiBaseUrl.host}${wsPath}`;
  }
  
  // 2. Fallback: Derive from window location (works for most deployments)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${DEFAULT_WS_PATH}`;
  }

  // 3. Fallback: Localhost default
  return `ws://localhost:4000${DEFAULT_WS_PATH}`;
}
