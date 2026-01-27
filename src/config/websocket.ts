const DEFAULT_WS_PATH = '/ws';

function resolveBaseUrl(input?: string) {
  if (!input) return null;
  if (input.startsWith('http://') || input.startsWith('https://')) return new URL(input);
  return null;
}

export function getWebSocketUrl(): string {
  const explicitUrl = import.meta.env.VITE_WS_URL;
  if (explicitUrl) return explicitUrl;

  const apiBaseUrl = resolveBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (apiBaseUrl) {
    const protocol = apiBaseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${apiBaseUrl.host}${DEFAULT_WS_PATH}`;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${DEFAULT_WS_PATH}`;
  }

  return `ws://localhost:1337${DEFAULT_WS_PATH}`;
}
