import TeachmoTestRunner from './testRunner.js';

async function runComprehensiveTests() {
  const runner = new TeachmoTestRunner();
  await runner.runAllTests();
}

// Run if called directly
if (import.meta.main) {
  runComprehensiveTests();
}

export { runComprehensiveTests };