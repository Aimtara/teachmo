import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest configuration for the Teachmo UI component library.
//
// This mirrors the Jest setup by using jsdom and the same
// setup file. Having both Jest and Vitest configs allows
// teams to choose their preferred test runner.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Default to jsdom for UI tests.
    environment: 'jsdom',
    // Use a Vitest-specific setup file so legacy Jest-style tests can run under Vitest.
    setupFiles: ['./setupVitest.js', './src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/components/testing/**/*', 'src/components/specs/**/*'],
      lines: 50,
      functions: 50,
      branches: 40,
      statements: 50,
    },

    // Some server-side tests should not run in jsdom.
    environmentMatchGlobs: [
      ['backend/**/*.{test,spec}.{js,jsx,ts,tsx}', 'node'],
      ['nhost/functions/**/*.{test,spec}.{js,jsx,ts,tsx}', 'node'],
      ['scripts/**/*.{test,spec}.{js,jsx,ts,tsx}', 'node'],
    ],
    exclude: ['node_modules', 'dist', 'backend/**', 'scripts/**'],
  },
});
