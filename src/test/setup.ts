import '@testing-library/jest-dom';
import { vi } from 'vitest';

const globalWithCompat = globalThis as typeof globalThis & {
  compatClient?: {
    getAuth: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    auth: { me: ReturnType<typeof vi.fn> };
    entities: Record<string, unknown>;
    functions: Record<string, unknown>;
  };
};

if (!globalWithCompat.compatClient) {
  const compat = {
    getAuth: vi.fn(),
    call: vi.fn(),
    auth: {
      me: vi.fn()
    },
    entities: {},
    functions: {}
  };

  globalWithCompat.compatClient = compat;
}
