# Testing Configuration

Since the platform doesn't allow root-level configuration files, here are the configurations that would typically be needed to run these tests in a standard development environment:

## package.json (dependencies and scripts)
```json
{
  "name": "teachmo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext js,jsx --fix",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "framer-motion": "^10.16.4",
    "date-fns": "^2.30.0",
    "lodash": "^4.17.21",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "eslint-plugin-jsx-a11y": "^6.7.1",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.6.2",
    "jest-environment-jsdom": "^29.6.2",
    "@babel/preset-env": "^7.22.9",
    "@babel/preset-react": "^7.22.5"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/components/testing/setup.js"],
    "moduleNameMapping": {
      "^@/(.*)$": "<rootDir>/$1",
      "\\.(css|less|scss|sass)$": "identity-obj-proxy"
    },
    "transform": {
      "^.+\\.(js|jsx)$": "babel-jest"
    },
    "collectCoverageFrom": [
      "components/**/*.{js,jsx}",
      "pages/**/*.{js,jsx}",
      "!components/testing/**",
      "!**/*.test.{js,jsx}",
      "!**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

## .babelrc
```json
{
  "presets": [
    ["@babel/preset-env", { "targets": "defaults" }],
    ["@babel/preset-react", { "runtime": "automatic" }]
  ]
}
```

## jest.config.js
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/components/testing/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'pages/**/*.{js,jsx}',
    '!components/testing/**',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '<rootDir>/components/testing/**/*.test.{js,jsx}'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testTimeout: 10000
};
```

## Usage

To use this testing framework in a typical development environment:

1. Copy the configuration above to the appropriate files
2. Install the dependencies listed in package.json
3. Run tests using the npm scripts defined above

The tests are designed to work with these configurations and provide comprehensive coverage of the Teachmo application's critical functionality.