// Global test setup for Jest
//
// Extends Jest's expect object with additional DOM assertions
// from the @testing-library/jest-dom package. This import
// should run before any tests are executed.

import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}
