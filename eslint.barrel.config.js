import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

const restrictedImports = [
  {
    group: ['@/API/*', '@/API/**'],
    caseSensitive: true,
    message: 'Use "@/api" instead of "@/API".'
  },
  {
    group: ['@/api/functions/*', '@/api/functions/**'],
    message: 'Use "@/api/functions" barrel imports instead of direct file paths.'
  },
  {
    group: ['@/api/entities/*', '@/api/entities/**'],
    message: 'Use "@/api/entities" barrel imports instead of direct file paths.'
  }
];

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'src/components/testing/README.jsx',
      'src/components/testing/package.jsx',
      'src/components/testing/testRunSummary.jsx',
      'src/pages/AdminDSARManager.jsx',
      'src/pages/AdminImpersonation.jsx',
      'src/pages/AdminNotificationCampaigns.jsx',
      'src/pages/AdminPartnerIncentives.jsx',
      'src/pages/AdminPromptManagement.jsx',
      'src/pages/AdminRoleBudgets.jsx',
      'src/pages/AdminSISPermissions.jsx',
      'src/pages/AdminSISSync.jsx',
      'src/pages/AdminScheduledReports.jsx'
    ]
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: { ...globals.browser, ...globals.node, ...globals.jest }
    },
    rules: {
      'no-restricted-imports': ['error', { patterns: restrictedImports }]
    }
  }
];
