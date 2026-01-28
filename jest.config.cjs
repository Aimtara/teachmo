/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/backend/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/backend/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/nhost/functions/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/nhost/functions/**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react$': '<rootDir>/src/__mocks__/lucide-react.js',
    '^msw$': '<rootDir>/src/__mocks__/msw.js',
    '^msw/node$': '<rootDir>/src/__mocks__/msw-node.js',
    '^react-markdown$': '<rootDir>/src/__mocks__/react-markdown.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
};
