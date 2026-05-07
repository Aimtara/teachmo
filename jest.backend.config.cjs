/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Run ONLY backend tests here (no DOM setupFilesAfterEnv from the frontend config).
  testMatch: [
    '<rootDir>/backend/__tests__/**/*.(test|spec).(js|ts)',
    '<rootDir>/nhost/functions/__tests__/**/*.(test|spec).(js|ts)',
    '<rootDir>/nhost/functions/lib/__tests__/**/*.(test|spec).(js|ts)',
  ],
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^\\./(types|state|state_patch|policy|features|pgStore|weekly|weekly_llm|candidates|scoring|scoring_plan|planner)\\.js$': '<rootDir>/backend/orchestrator/$1.ts',
    '^\\.\\./orchestrator/(types|state|state_patch|policy|features|pgStore|weekly|weekly_llm|candidates|scoring|scoring_plan|planner)\\.js$': '<rootDir>/backend/orchestrator/$1.ts',
    '^\\.\\./compliance/(redaction|dataClassification|auditEvents|consentLedger|aiGovernance|remediationBacklog)\\.js$': '<rootDir>/backend/compliance/$1.ts',
    '^\\./(redaction|dataClassification|auditEvents|consentLedger|aiGovernance|remediationBacklog)\\.js$': '<rootDir>/backend/compliance/$1.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
};
