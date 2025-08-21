
// Jest configuration for Teachmo testing framework
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/components/testing/testSetup.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: [
        '@babel/plugin-transform-runtime'
      ]
    }],
  },
  testMatch: [
    '<rootDir>/components/testing/specs/**/*.test.{js,jsx}',
    '<rootDir>/components/testing/integration/**/*.test.{js,jsx}'
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'pages/**/*.{js,jsx}',
    '!components/testing/**',
    '!**/*.stories.{js,jsx}',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,
  bail: false,
  cache: true,
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Export for ES6 environments
// This line might cause a syntax error in a pure CommonJS environment if not transpiled.
// However, Jest typically uses babel-jest or similar for config files, or it's implicitly
// handled by the environment. If issues arise, consider removing this line if the file
// is exclusively for Jest and never imported as an ES module.
export default config;
