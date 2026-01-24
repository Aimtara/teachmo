/* eslint-env node */
/**
 * Unit test for execution board validation schemas
 */
import {
  epicPatchSchema,
  gatePatchSchema,
  slicePatchSchema,
} from '../validation/executionBoard.js';

function runTests() {
  console.log('🧪 Testing Execution Board Validation Schemas\n');
  let passCount = 0;
  let failCount = 0;

  // Test 1: Valid epic status
  console.log('Test 1: Valid epic status "Done"');
  const test1 = epicPatchSchema.safeParse({ status: 'Done' });
  if (test1.success) {
    console.log('✅ Pass - Valid status accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Valid status rejected:', test1.error.issues, '\n');
    failCount++;
  }

  // Test 2: Invalid epic status
  console.log('Test 2: Invalid epic status "InvalidStatus"');
  const test2 = epicPatchSchema.safeParse({ status: 'InvalidStatus' });
  if (!test2.success) {
    console.log('✅ Pass - Invalid status rejected\n');
    passCount++;
  } else {
    console.log('❌ Fail - Invalid status accepted\n');
    failCount++;
  }

  // Test 3: Valid gate status
  console.log('Test 3: Valid gate status "In progress"');
  const test3 = gatePatchSchema.safeParse({ status: 'In progress' });
  if (test3.success) {
    console.log('✅ Pass - Valid gate status accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Valid gate status rejected:', test3.error.issues, '\n');
    failCount++;
  }

  // Test 4: Invalid gate status (Done is not allowed for gates)
  console.log('Test 4: Invalid gate status "Done" (not in gate enum)');
  const test4 = gatePatchSchema.safeParse({ status: 'Done' });
  if (!test4.success) {
    console.log('✅ Pass - "Done" correctly rejected for gate\n');
    passCount++;
  } else {
    console.log('❌ Fail - "Done" incorrectly accepted for gate\n');
    failCount++;
  }

  // Test 5: Valid slice status
  console.log('Test 5: Valid slice status "Planned"');
  const test5 = slicePatchSchema.safeParse({ status: 'Planned' });
  if (test5.success) {
    console.log('✅ Pass - Valid slice status accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Valid slice status rejected:', test5.error.issues, '\n');
    failCount++;
  }

  // Test 6: Multiple valid fields
  console.log('Test 6: Multiple valid fields for epic');
  const test6 = epicPatchSchema.safeParse({ 
    status: 'In progress',
    notes: 'Updated notes',
    railPriority: 1
  });
  if (test6.success) {
    console.log('✅ Pass - Multiple valid fields accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Multiple valid fields rejected:', test6.error.issues, '\n');
    failCount++;
  }

  // Test 7: Empty body (should succeed as all fields are optional)
  console.log('Test 7: Empty request body (all fields optional)');
  const test7 = epicPatchSchema.safeParse({});
  if (test7.success) {
    console.log('✅ Pass - Empty body accepted (all fields optional)\n');
    passCount++;
  } else {
    console.log('❌ Fail - Empty body rejected:', test7.error.issues, '\n');
    failCount++;
  }

  // Test 8: All valid epic statuses
  console.log('Test 8: All valid epic statuses');
  const validStatuses = ['Backlog', 'Planned', 'In progress', 'Done'];
  let allPassed = true;
  for (const status of validStatuses) {
    const result = epicPatchSchema.safeParse({ status });
    if (!result.success) {
      console.log(`  ❌ Failed for "${status}"`);
      allPassed = false;
    }
  }
  if (allPassed) {
    console.log('✅ Pass - All valid statuses accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Some valid statuses rejected\n');
    failCount++;
  }

  // Test 9: All valid gate statuses
  console.log('Test 9: All valid gate statuses');
  const validGateStatuses = ['Backlog', 'Planned', 'In progress'];
  allPassed = true;
  for (const status of validGateStatuses) {
    const result = gatePatchSchema.safeParse({ status });
    if (!result.success) {
      console.log(`  ❌ Failed for "${status}"`);
      allPassed = false;
    }
  }
  if (allPassed) {
    console.log('✅ Pass - All valid gate statuses accepted\n');
    passCount++;
  } else {
    console.log('❌ Fail - Some valid gate statuses rejected\n');
    failCount++;
  }

  console.log('═'.repeat(50));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed`);
  
  if (failCount === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

runTests();
