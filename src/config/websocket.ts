const DEFAULT_WS_PATH = '/ws';

type WebSocketEnv = {
  VITE_WS_URL?: string;
  VITE_API_BASE_URL?: string;
  MODE?: string;
};

type LocationLike = {
  protocol: string;
  host: string;
};

function toWebSocketProtocol(protocol: string) {
  return protocol === 'https:' ? 'wss:' : 'ws:';
}

function normalizeWsUrl(raw?: string): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  if (value.startsWith('ws://') || value.startsWith('wss://')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const parsed = new URL(value);
    parsed.protocol = toWebSocketProtocol(parsed.protocol);
    return parsed.toString();
  }

  return null;
}

function resolveApiBase(raw?: string): URL | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return new URL(value);
  return null;
}

export function resolveWebSocketUrl(
  env: WebSocketEnv,
  opts: { location?: LocationLike } = {},
): string | null {
  const explicit = normalizeWsUrl(env.VITE_WS_URL);
  if (explicit) return explicit;

  const apiBaseUrl = resolveApiBase(env.VITE_API_BASE_URL);
  if (apiBaseUrl) {
    // Keep WebSocket on the API host but always use canonical /ws endpoint.
    const protocol = toWebSocketProtocol(apiBaseUrl.protocol);
    return `${protocol}//${apiBaseUrl.host}${DEFAULT_WS_PATH}`;
  }

  const location = opts.location;
  const isLocalHost = Boolean(location?.host && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(location.host));
  if (isLocalHost) {
    return `ws://localhost:4000${DEFAULT_WS_PATH}`;
  }

  return null;
}

export function getWebSocketUrl(): string | null {
  const location = typeof window !== 'undefined'
    ? { protocol: window.location.protocol, host: window.location.host }
    : undefined;

  return resolveWebSocketUrl(import.meta.env, { location });
}
