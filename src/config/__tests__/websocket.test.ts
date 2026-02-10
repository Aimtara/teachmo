import { describe, expect, it } from 'vitest';
import { resolveWebSocketUrl } from '@/config/websocket';

describe('resolveWebSocketUrl', () => {
  it('uses explicit ws url when provided', () => {
    const url = resolveWebSocketUrl({ VITE_WS_URL: 'wss://api.example.com/ws' });
    expect(url).toBe('wss://api.example.com/ws');
  });

  it('normalizes explicit https websocket url to wss', () => {
    const url = resolveWebSocketUrl({ VITE_WS_URL: 'https://api.example.com/ws' });
    expect(url).toBe('wss://api.example.com/ws');
  });

  it('derives ws url from absolute api base url using canonical /ws endpoint', () => {
    const url = resolveWebSocketUrl({ VITE_API_BASE_URL: 'https://api.example.com/v1' });
    expect(url).toBe('wss://api.example.com/ws');
  });

  it('uses localhost backend websocket in local development without explicit env', () => {
    const url = resolveWebSocketUrl({}, { location: { protocol: 'http:', host: 'localhost:5173' } });
    expect(url).toBe('ws://localhost:4000/ws');
  });

  it('returns null when endpoint cannot be safely inferred', () => {
    const url = resolveWebSocketUrl({}, { location: { protocol: 'https:', host: 'teachmo-pilot.onrender.com' } });
    expect(url).toBeNull();
  });
});
