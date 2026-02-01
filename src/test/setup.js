import '@testing-library/jest-dom';
import { vi } from 'vitest';

if (!globalThis.base44) {
  globalThis.base44 = {
    getAuth: vi.fn(),
    call: vi.fn(),
  };
}
