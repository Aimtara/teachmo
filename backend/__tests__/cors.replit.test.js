import { isExplicitlyAllowedReplitOrigin } from '../utils/corsOrigins.js';

test('blocks replit preview origin when feature is disabled', () => {
  expect(isExplicitlyAllowedReplitOrigin('https://preview-123.replit.dev', false)).toBe(false);
});

test('allows recognized replit preview domains when feature is enabled', () => {
  expect(isExplicitlyAllowedReplitOrigin('https://preview-123.replit.dev', true)).toBe(true);
  expect(isExplicitlyAllowedReplitOrigin('https://preview-123.repl.co', true)).toBe(true);
  expect(isExplicitlyAllowedReplitOrigin('https://preview-123.replit.app', true)).toBe(true);
});

test('rejects non-replit or malformed origins even when feature is enabled', () => {
  expect(isExplicitlyAllowedReplitOrigin('https://example.com', true)).toBe(false);
  expect(isExplicitlyAllowedReplitOrigin('http://preview-123.replit.dev', true)).toBe(false);
  expect(isExplicitlyAllowedReplitOrigin('', true)).toBe(false);
});
