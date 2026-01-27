// Global test setup for Vitest.
//
// This file intentionally keeps legacy Jest-style tests running under Vitest by
// attaching a minimal `globalThis.jest` shim that maps to `vi`.

import '@testing-library/jest-dom';
import { vi } from 'vitest';

if (!globalThis.jest) {
  globalThis.jest = {};
}

Object.assign(globalThis.jest, {
  mock: vi.mock,
  fn: vi.fn,
  spyOn: vi.spyOn,
  mocked: vi.mocked,

  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,

  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  runAllTimers: vi.runAllTimers,
  advanceTimersByTime: vi.advanceTimersByTime,

  importActual: vi.importActual,
});
