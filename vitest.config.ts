import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest configuration for the Teachmo UI component library.
//
// This mirrors the Jest setup by using jsdom and the same
// setup file. Having both Jest and Vitest configs allows
// teams to choose their preferred test runner.

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.js',
    globals: true,
    exclude: ['node_modules', 'dist', 'backend/**', 'scripts/**']
  },
});
