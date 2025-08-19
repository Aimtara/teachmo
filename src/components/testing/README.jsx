# Teachmo Testing Framework

This comprehensive testing framework provides robust testing capabilities for the Teachmo application, covering unit tests, integration tests, performance monitoring, and accessibility testing.

## Overview

The testing framework is designed to:
- Ensure component reliability and functionality
- Prevent regressions during development
- Monitor performance and identify bottlenecks
- Validate accessibility standards
- Support continuous integration workflows

## Getting Started

### Installation

```bash
# Install testing dependencies
npm install

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
components/testing/
├── specs/           # Unit tests for individual components
├── integration/     # End-to-end user flow tests  
├── performance/     # Performance monitoring and benchmarks
├── mocks/          # Mock data and API responses
├── testUtils.jsx   # Common testing utilities and helpers
├── testSetup.js    # Global test configuration
└── README.md       # This file
```

## Writing Tests

### Unit Tests

Unit tests should focus on individual component behavior:

```jsx
import { renderWithProviders, createMockUser } from '../testUtils';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly with required props', () => {
    const props = { title: 'Test Title' };
    renderWithProviders(<MyComponent {...props} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests should cover complete user workflows:

```jsx
import { renderWithProviders, testUtils } from '../testUtils';

describe('User Onboarding Flow', () => {
  it('completes parent onboarding successfully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { initialEntries: ['/welcome'] });
    
    // Test complete workflow...
    await testUtils.fillField(user, /name/i, 'John Doe');
    await testUtils.clickButton(user, /continue/i);
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
```

## Test Utilities

### `renderWithProviders`

Renders components with all necessary providers (Router, Toast, etc.):

```jsx
const { user } = renderWithProviders(<MyComponent />);
```

### Mock Data Factories

Create consistent test data:

```jsx
const user = createMockUser({ role: 'parent' });
const child = createMockChild({ age: 5 });
const activity = createMockActivity({ category: 'creative' });
```

### Test Utilities

Common testing operations:

```jsx
// Wait for elements
await testUtils.waitForElement('my-element');

// Fill form fields
await testUtils.fillField(user, /email/i, 'test@example.com');

// Click buttons
await testUtils.clickButton(user, /submit/i);

// Wait for loading to finish
await testUtils.waitForLoadingToFinish();
```

### Accessibility Testing

Validate accessibility standards:

```jsx
import { a11yUtils } from '../testUtils';

it('meets accessibility standards', () => {
  renderWithProviders(<MyComponent />);
  
  a11yUtils.checkHeadingHierarchy();
  a11yUtils.checkFormLabels();
});
```

## Performance Testing

### Component Performance

Monitor render performance:

```jsx
import { performanceUtils } from '../testUtils';

it('renders within performance threshold', async () => {
  const renderTime = await performanceUtils.measureRenderTime(<MyComponent />);
  expect(renderTime).toBeLessThan(16); // 60fps threshold
});
```

### Memory Leak Detection

Check for proper cleanup:

```jsx
it('cleans up properly on unmount', () => {
  const { unmount } = renderWithProviders(<MyComponent />);
  
  unmount();
  performanceUtils.checkCleanup();
});
```

## Mock Service Worker (MSW)

API calls are mocked using MSW for consistent testing:

```jsx
import { server } from '../mocks/server';
import { rest } from 'msw';

// Override default mock response
server.use(
  rest.get('/api/children', (req, res, ctx) => {
    return res(ctx.json([customMockChild]));
  })
);
```

## Coverage Requirements

The framework enforces minimum coverage thresholds:

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

## Continuous Integration

Tests are configured to run in CI environments:

```bash
npm run test:ci
```

This command:
- Runs all tests without watch mode
- Generates coverage reports
- Exits with appropriate codes for CI/CD pipelines

## Performance Monitoring

### PerformanceMonitor Component

Wrap components to monitor render performance:

```jsx
import { PerformanceMonitor } from '../testing/performance/PerformanceMonitor';

<PerformanceMonitor 
  componentName="MyComponent"
  onMetric={(metric) => console.log(metric)}
>
  <MyComponent />
</PerformanceMonitor>
```

### Bundle Size Analysis

Monitor bundle size impact:

```jsx
import { performanceTestUtils } from '../testing/performance/PerformanceMonitor';

const bundleSize = await performanceTestUtils.measureBundleSize('./MyComponent');
```

## Best Practices

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

### Mock Data
- Use factory functions for consistent test data
- Keep mock data minimal but realistic
- Update mocks when API contracts change

### Accessibility
- Include accessibility tests for all user-facing components
- Test keyboard navigation paths
- Validate screen reader compatibility

### Performance
- Set appropriate performance thresholds for your use case
- Test on both fast and slow devices/networks
- Monitor for memory leaks in components with side effects

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npm test MyComponent.test.jsx

# Run tests matching pattern
npm test --testNamePattern="renders correctly"
```

### Debug Mode

```bash
# Run tests with Node debugger
npm run test:debug
```

### Verbose Output

```bash
# See detailed test output
npm test -- --verbose
```

## Advanced Features

### Custom Matchers

The framework includes custom matchers for common testing patterns:

```jsx
expect(component).toHandleLoading();
expect(component).toHandleErrors(errorTrigger);
```

### Test Data Management

Mock data is centrally managed and can be extended:

```jsx
// Add new mock data factory
export const createMockEvent = (overrides = {}) => ({
  id: 'event-123',
  title: 'Test Event',
  date: '2024-01-15',
  ...overrides,
});
```

### Performance Benchmarking

Compare performance across different implementations:

```jsx
const benchmarkResults = await Promise.all([
  performanceUtils.measureRenderTime(<ComponentV1 />),
  performanceUtils.measureRenderTime(<ComponentV2 />),
]);
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase `testTimeout` in jest.config.js
2. **Mock not working**: Check MSW handler configuration
3. **Component not rendering**: Verify all required providers are included
4. **Accessibility test failing**: Check for proper ARIA labels and semantic HTML

### Getting Help

- Check the existing test files for examples
- Review the test utilities for available helpers
- Consult Jest and Testing Library documentation for advanced patterns

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain coverage thresholds
4. Add accessibility tests for UI components
5. Update this README if adding new testing patterns