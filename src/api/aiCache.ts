// Simple in-memory caching layer for AI responses
//
// This module exports helpers to store and retrieve AI responses. By
// caching frequently requested outputs (e.g. repeated prompts), you can
// reduce API calls and latency. In production, replace this in-memory
// cache with a distributed cache such as Redis or a persisted database.

interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getFromCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function storeInCache(key: string, value: any, ttlMs = 24 * 60 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { key, value, expiresAt });
}
