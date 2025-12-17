---
applies_to:
  - "**/*.test.js"
  - "**/*.spec.js"
  - "backend/__tests__/**"
---

# Testing Instructions

## Testing Philosophy

- **Write tests for backend APIs**: All new backend routes should have tests
- **Test critical paths**: Focus on important functionality
- **Test edge cases**: Handle errors, invalid inputs, boundary conditions
- **Keep tests maintainable**: Follow existing patterns and conventions

## Backend Testing with Jest + Supertest

### Test File Organization
```
backend/
  __tests__/
    assignments.test.js
    submissions.test.js
    users.test.js
  routes/
    assignments.js
    submissions.js
    users.js
```

### Standard Test Template
```javascript
import request from 'supertest';
import express from 'express';
import myRouter from '../routes/myRoute.js';
import { query } from '../db.js';

// Mock all external dependencies
jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

// Set up test app
const app = express();
app.use(express.json());
app.use('/api/endpoint', myRouter);

describe('Endpoint Name API', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Clean up after tests
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/endpoint', () => {
    test('returns data successfully', async () => {
      // Arrange - set up mock data
      const mockData = [{ id: 1, name: 'Test' }];
      query.mockResolvedValue({ rows: mockData });
      
      // Act - make request
      const response = await request(app).get('/api/endpoint');
      
      // Assert - verify results
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(query).toHaveBeenCalledTimes(1);
    });
    
    test('handles empty results', async () => {
      query.mockResolvedValue({ rows: [] });
      
      const response = await request(app).get('/api/endpoint');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    test('handles database errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app).get('/api/endpoint');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/endpoint', () => {
    test('creates resource with valid data', async () => {
      const newResource = { id: 1, name: 'New Resource' };
      query.mockResolvedValue({ rows: [newResource] });
      
      const response = await request(app)
        .post('/api/endpoint')
        .send({ name: 'New Resource' });
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual(newResource);
    });
    
    test('validates required fields', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/required/i);
    });
    
    test('handles duplicate entries', async () => {
      const error = new Error('Duplicate key');
      error.code = '23505'; // PostgreSQL unique violation
      query.mockRejectedValue(error);
      
      const response = await request(app)
        .post('/api/endpoint')
        .send({ name: 'Duplicate' });
      
      expect(response.status).toBe(409);
    });
  });
  
  describe('PUT /api/endpoint/:id', () => {
    test('updates existing resource', async () => {
      const updatedResource = { id: 1, name: 'Updated Name' };
      query.mockResolvedValue({ rows: [updatedResource] });
      
      const response = await request(app)
        .put('/api/endpoint/1')
        .send({ name: 'Updated Name' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedResource);
    });
    
    test('returns 404 for non-existent resource', async () => {
      query.mockResolvedValue({ rows: [] });
      
      const response = await request(app)
        .put('/api/endpoint/999')
        .send({ name: 'Updated Name' });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/endpoint/:id', () => {
    test('deletes existing resource', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      const response = await request(app).delete('/api/endpoint/1');
      
      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalled();
    });
    
    test('returns 404 for non-existent resource', async () => {
      query.mockResolvedValue({ rows: [] });
      
      const response = await request(app).delete('/api/endpoint/999');
      
      expect(response.status).toBe(404);
    });
  });
});
```

## Mocking Strategies

### Mocking Database Calls
```javascript
// Mock the entire db module
jest.mock('../db.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

// Set up different responses for different tests
test('example test', () => {
  query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
       .mockResolvedValueOnce({ rows: [{ id: 2 }] });
  
  // First call returns id: 1, second call returns id: 2
});

// Mock rejection for error testing
test('handles errors', () => {
  query.mockRejectedValue(new Error('Connection failed'));
  // Test error handling
});
```

### Mocking External APIs
```javascript
import fetch from 'node-fetch';

jest.mock('node-fetch');

test('calls external API', async () => {
  fetch.mockResolvedValue({
    json: async () => ({ data: 'mock data' }),
    ok: true,
  });
  
  // Test code that uses fetch
});
```

### Mocking Authentication
```javascript
// Mock middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id', role: 'admin' };
  next();
};

app.use(mockAuth);
app.use('/api/protected', protectedRouter);

test('allows authenticated requests', async () => {
  const response = await request(app).get('/api/protected');
  expect(response.status).not.toBe(401);
});
```

## Test Coverage Goals

### What to Test
✅ **Must Test**:
- All CRUD operations (Create, Read, Update, Delete)
- Input validation and error messages
- Authentication and authorization checks
- Database error handling
- Business logic and calculations
- Edge cases and boundary conditions

✅ **Should Test**:
- Pagination and sorting
- Search and filtering
- Data transformations
- Complex queries
- Transaction handling

⚠️ **Optional**:
- Simple getters/setters
- Configuration loading
- Logging calls

### Coverage Targets
- Aim for 80%+ code coverage on backend routes
- 100% coverage on critical business logic
- All error paths should be tested

## Test Organization Patterns

### Group Related Tests
```javascript
describe('User Management', () => {
  describe('User Creation', () => {
    test('creates user with valid data', () => {});
    test('validates email format', () => {});
    test('prevents duplicate emails', () => {});
  });
  
  describe('User Updates', () => {
    test('updates user profile', () => {});
    test('prevents role escalation', () => {});
  });
  
  describe('User Deletion', () => {
    test('soft deletes user', () => {});
    test('cleans up related data', () => {});
  });
});
```

### Use Setup and Teardown
```javascript
describe('Database Tests', () => {
  let testUserId;
  
  beforeAll(async () => {
    // One-time setup for all tests
    await setupTestDatabase();
  });
  
  beforeEach(async () => {
    // Setup before each test
    testUserId = await createTestUser();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await deleteTestUser(testUserId);
  });
  
  afterAll(async () => {
    // Final cleanup
    await teardownTestDatabase();
  });
  
  test('example test', async () => {
    // Test uses testUserId
  });
});
```

## Common Testing Patterns

### Testing Async Operations
```javascript
test('async operation succeeds', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

test('async operation fails', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing with Timeouts
```javascript
test('operation completes quickly', async () => {
  const start = Date.now();
  await quickOperation();
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100); // Should complete in < 100ms
});
```

### Testing Query Parameters
```javascript
test('handles query parameters', async () => {
  const response = await request(app)
    .get('/api/items')
    .query({ page: 2, limit: 10, sort: 'name' });
  
  expect(response.status).toBe(200);
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('LIMIT'),
    expect.arrayContaining([10, 10]) // limit and offset
  );
});
```

### Testing Headers
```javascript
test('requires authentication header', async () => {
  const response = await request(app)
    .get('/api/protected')
    .set('Authorization', 'Bearer token123');
  
  expect(response.status).not.toBe(401);
});
```

### Testing File Uploads
```javascript
test('handles file upload', async () => {
  const response = await request(app)
    .post('/api/upload')
    .attach('file', 'path/to/test-file.pdf')
    .field('description', 'Test file');
  
  expect(response.status).toBe(201);
});
```

## Assertions and Matchers

### Common Jest Matchers
```javascript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).toStrictEqual(expected);  // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveReturned();

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(error);
```

## Running Tests

### Command Line
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- assignments.test.js

# Run with coverage
npm test -- --coverage

# Run tests matching pattern
npm test -- --testNamePattern="User"
```

### Test Configuration
```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
  ],
};
```

## Debugging Tests

### Using console.log
```javascript
test('debug test', () => {
  console.log('Value:', someValue);
  console.log('Mock calls:', query.mock.calls);
  expect(someValue).toBe(expected);
});
```

### Inspecting Mock Calls
```javascript
test('verify mock interactions', () => {
  query.mockResolvedValue({ rows: [] });
  
  // Make API call
  
  console.log('Times called:', query.mock.calls.length);
  console.log('Call arguments:', query.mock.calls[0]);
  console.log('All calls:', query.mock.calls);
});
```

### Running Single Test
```javascript
// Use .only to run just this test
test.only('focused test', () => {
  // Only this test runs
});

// Skip a test
test.skip('skipped test', () => {
  // This test won't run
});
```

## Best Practices

### DO:
✅ Write descriptive test names that explain what's being tested  
✅ Follow the Arrange-Act-Assert pattern  
✅ Test one thing per test case  
✅ Mock external dependencies  
✅ Clean up after tests (clear mocks, reset state)  
✅ Test both success and failure paths  
✅ Use appropriate matchers for better error messages  

### DON'T:
❌ Test implementation details  
❌ Write tests that depend on other tests  
❌ Use real databases in unit tests  
❌ Skip error cases  
❌ Write tests that are too long or complex  
❌ Use magic numbers without explanation  
❌ Forget to assert in your tests  

## Common Issues and Solutions

### Issue: Tests pass individually but fail together
**Solution**: Tests have shared state. Use `beforeEach` to reset state.

### Issue: Async tests hang or timeout
**Solution**: Make sure to `await` promises and return from async tests.

### Issue: Mocks not working
**Solution**: Check mock is defined before code runs, clear mocks between tests.

### Issue: Coverage not accurate
**Solution**: Check `collectCoverageFrom` in jest.config.js includes your files.

### Issue: Flaky tests (sometimes pass, sometimes fail)
**Solution**: Avoid timing dependencies, ensure proper cleanup, check for race conditions.
