// Global test setup for Jest
//
// Extends Jest's expect object with additional DOM assertions
// from the @testing-library/jest-dom package. This import
// should run before any tests are executed.

import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

jest.mock('@nhost/react', () => {
  const actual = jest.requireActual('@nhost/react');
  return {
    ...actual,
    useAuthenticationStatus: () => ({ isAuthenticated: true, isLoading: false }),
    useUserData: () => ({
      metadata: { role: 'teacher' },
      roles: ['teacher'],
      defaultRole: 'teacher',
    }),
  };
});

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}

if (!process.env.MODE) {
  process.env.MODE = 'test';
}

if (process.env.DEV === undefined) {
  process.env.DEV = '';
}

if (process.env.PROD === undefined) {
  process.env.PROD = '';
}
