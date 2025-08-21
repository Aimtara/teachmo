// Jest configuration for Teachmo UI component library.
//
// This setup uses jsdom to simulate the DOM for React component tests
// and maps our alias (@/) to the src directory. CSS imports are mocked
// using identity-obj-proxy.

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(test).[jt]sx'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
  collectCoverageFrom: [
    'src/components/teachmo/**/*.{js,jsx,ts,tsx}',
    '!**/*.stories.{js,jsx,ts,tsx}',
  ],
};