const DEFAULT_WS_PATH = '/ws';

export function getWebSocketUrl(): string {
  // 1. Trust the explicit environment variable if set (Best for Production)
  const explicitUrl = import.meta.env.VITE_WS_URL;
  if (explicitUrl) return explicitUrl;

  // 2. Fallback: Derive from window location (works for most deployments)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${DEFAULT_WS_PATH}`;
  }

  // 3. Fallback: Localhost default
  return `ws://localhost:4000${DEFAULT_WS_PATH}`;
}
