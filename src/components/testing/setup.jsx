// Jest setup file - would typically be referenced in package.json or jest.config.js
import '@testing-library/jest-dom';

// Define Jest globals for the setup file
/* global jest, beforeAll, afterAll, global */

// Mock entities globally
const mockEntityMethods = {
  list: jest.fn(),
  filter: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  bulkCreate: jest.fn(),
  me: jest.fn(),
  updateMyUserData: jest.fn(),
  logout: jest.fn(),
  login: jest.fn(),
  loginWithRedirect: jest.fn()
};

// Mock all entity imports
jest.mock('@/api/entities', () => ({
  User: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  Child: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  Activity: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  ParentingTip: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  UserMessage: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  Course: mockEntityMethods
}));

jest.mock('@/api/entities', () => ({
  Assignment: mockEntityMethods
}));

// Mock function imports
jest.mock('@/api/functions', () => ({
  googleClassroomSync: jest.fn()
}));

jest.mock('@/api/functions', () => ({
  handleGoogleDisconnect: jest.fn()
}));

jest.mock('@/api/functions', () => ({
  getGoogleAuthUrl: jest.fn()
}));

jest.mock('@/api/functions', () => ({
  aiActivitySuggestions: jest.fn()
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' })
}));

// Mock framer-motion for performance in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    ul: 'ul',
    li: 'li'
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    set: jest.fn()
  })
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Suppress console errors for cleaner test output (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});