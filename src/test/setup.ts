import '@testing-library/jest-dom';
import { vi } from 'vitest';

const globalWithBase44 = globalThis as typeof globalThis & {
  base44?: {
    getAuth: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    auth: { me: ReturnType<typeof vi.fn> };
    entities: Record<string, unknown>;
    functions: Record<string, unknown>;
  };
};

if (!globalWithBase44.base44) {
  globalWithBase44.base44 = {
    getAuth: vi.fn(),
    call: vi.fn(),
    auth: {
      me: vi.fn(),
    },
    entities: {},
    functions: {},
  };
}
