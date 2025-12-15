// Utility helpers for browser security hardening

const hasStorage = typeof window !== 'undefined' && Boolean(window.localStorage);

export const secureStorage = {
  setItem(key, value) {
    if (!hasStorage) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to set secure storage item', error);
      return false;
    }
  },
  getItem(key) {
    if (!hasStorage) return null;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to parse secure storage item', error);
      return null;
    }
  },
  removeItem(key) {
    if (!hasStorage) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove secure storage item', error);
      return false;
    }
  },
  clear() {
    if (!hasStorage) return false;
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear secure storage', error);
      return false;
    }
  },
};

export function detectSuspiciousInput(value) {
  if (typeof value !== 'string') return false;

  const suspiciousPatterns = [
    /<script.*?>/i,
    /javascript:/i,
    /\.{2}/, // detect directory traversal attempts without over-matching
    /%0d%0a/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(value));
}
