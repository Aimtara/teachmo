/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Run ONLY backend tests here (no DOM setupFilesAfterEnv from the frontend config).
  testMatch: ['<rootDir>/backend/__tests__/**/*.(test|spec).(js|ts)'],
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
};
