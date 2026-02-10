import { describe, expect, it } from 'vitest';
import { resolveWebSocketUrl, getWebSocketUrl } from '@/config/websocket';

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

describe('getWebSocketUrl', () => {
  it('appends token as query parameter when provided', () => {
    // Mock import.meta.env
    const originalEnv = import.meta.env;
    try {
      (import.meta as any).env = { VITE_WS_URL: 'ws://localhost:4000/ws' };
      
      const url = getWebSocketUrl('test-token-123');
      expect(url).toBe('ws://localhost:4000/ws?token=test-token-123');
    } finally {
      // Restore
      (import.meta as any).env = originalEnv;
    }
  });

  it('encodes token properly when appending as query parameter', () => {
    const originalEnv = import.meta.env;
    try {
      (import.meta as any).env = { VITE_WS_URL: 'ws://localhost:4000/ws' };
      
      const url = getWebSocketUrl('token+with/special=chars');
      expect(url).toContain('token=token%2Bwith%2Fspecial%3Dchars');
    } finally {
      (import.meta as any).env = originalEnv;
    }
  });

  it('returns base url without token when token is not provided', () => {
    const originalEnv = import.meta.env;
    try {
      (import.meta as any).env = { VITE_WS_URL: 'ws://localhost:4000/ws' };
      
      const url = getWebSocketUrl();
      expect(url).toBe('ws://localhost:4000/ws');
    } finally {
      (import.meta as any).env = originalEnv;
    }
  });

  it('returns null when base url cannot be resolved', () => {
    const originalEnv = import.meta.env;
    try {
      (import.meta as any).env = {};
      
      const url = getWebSocketUrl('test-token');
      expect(url).toBeNull();
    } finally {
      (import.meta as any).env = originalEnv;
    }
  });
});
