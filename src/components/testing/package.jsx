json
{
  "name": "teachmo-testing-framework",
  "version": "1.0.0",
  "description": "Comprehensive testing framework for Teachmo application",
  "type": "module",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:integration": "jest --testPathPattern=integration",
    "test:unit": "jest --testPathPattern=specs",
    "test:performance": "jest --testPathPattern=performance",
    "test:accessibility": "jest --testPathPattern=accessibility",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "lint:tests": "eslint components/testing/**/*.{js,jsx}"
  },
  "dependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.3.1",
    "jest-environment-jsdom": "^29.3.1",
    "msw": "^0.49.0",
    "babel-jest": "^29.3.1",
    "@babel/preset-env": "^7.20.2",
    "@babel/preset-react": "^7.18.6",
    "@babel/plugin-transform-runtime": "^7.19.6",
    "identity-obj-proxy": "^3.0.0",
    "jest-watch-typeahead": "^2.2.1"
  },
  "devDependencies": {
    "eslint": "^8.30.0",
    "eslint-plugin-jest": "^27.2.0",
    "eslint-plugin-testing-library": "^5.9.1"
  },
  "jest": {
    "projects": [
      {
        "displayName": "unit",
        "testMatch": ["<rootDir>/components/testing/specs/**/*.test.{js,jsx}"]
      },
      {
        "displayName": "integration", 
        "testMatch": ["<rootDir>/components/testing/integration/**/*.test.{js,jsx}"]
      },
      {
        "displayName": "performance",
        "testMatch": ["<rootDir>/components/testing/performance/**/*.test.{js,jsx}"]
      }
    ]
  }
}
