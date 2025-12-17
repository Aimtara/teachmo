---
applies_to:
  - "src/**/*.jsx"
  - "src/**/*.js"
  - "src/components/**"
  - "src/pages/**"
  - "src/domains/**"
---

# Frontend Code Instructions

## React Component Guidelines

### Component Structure
```javascript
import PropTypes from 'prop-types';

function ComponentName({ prop1, prop2, onAction }) {
  // Hooks at the top
  const [state, setState] = useState(initialValue);
  const { data, loading, error } = useQuery();
  
  // Event handlers
  const handleAction = () => {
    // Handle logic
  };
  
  // Early returns for loading/error states
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // Main render
  return (
    <div className="container">
      {/* Component content */}
    </div>
  );
}

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  onAction: PropTypes.func,
};

export default ComponentName;
```

### Hooks Usage
- Always call hooks at the top level (not in loops/conditions)
- Use `useState` for component-local state
- Use `useEffect` for side effects (API calls, subscriptions)
- Extract complex logic into custom hooks in `/src/hooks/`
- Use Zustand stores for global state (see existing stores)

### Data Fetching with GraphQL
**Use the shared GraphQL helper:**
```javascript
import { executeQuery, executeMutation } from '@/lib/graphql';

// In your component or domain file
const GET_ITEMS = `
  query GetItems($userId: uuid!) {
    items(where: { user_id: { _eq: $userId } }) {
      id
      name
      created_at
    }
  }
`;

async function fetchItems(userId) {
  const { data, error } = await executeQuery(GET_ITEMS, { userId });
  if (error) {
    console.error('Failed to fetch items:', error);
    return null;
  }
  return data.items;
}
```

**Use Nhost hooks for authentication:**
```javascript
import { useAuthenticated, useUserData } from '@nhost/react';

function ProtectedComponent() {
  const isAuthenticated = useAuthenticated();
  const user = useUserData();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Component content
}
```

## Styling Guidelines

### Tailwind CSS Conventions
- Use utility classes for styling
- Follow mobile-first responsive design
- Use existing design tokens from `tailwind.config.js`
- Group related utilities together

```javascript
// Good
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
    Action
  </button>
</div>

// Use clsx for conditional classes
import { clsx } from 'clsx';

<div className={clsx(
  "base-classes",
  isActive && "active-classes",
  hasError && "error-classes"
)}>
```

### Radix UI Components
- Prefer Radix UI components from `/src/components/ui/` for accessibility
- Don't recreate components that already exist
- Follow the established pattern for new UI components

```javascript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Use existing components
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

## Form Handling

### React Hook Form + Zod Pattern
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(0).max(120),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
      age: 0,
    },
  });
  
  const onSubmit = async (values) => {
    try {
      await submitData(values);
      toast.success('Form submitted successfully');
    } catch (error) {
      toast.error('Failed to submit form');
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Routing

### React Router v7
```javascript
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const handleNavigate = () => {
    navigate('/path/to/page', { state: { data: 'value' } });
  };
  
  // Component logic
}
```

### Protected Routes
- Check authentication status with Nhost hooks
- Redirect unauthenticated users to `/login`
- Check user roles before rendering role-specific content

## Domain Organization

### Keep Business Logic Separate
- Place data fetching logic in `/src/domains/` files
- Keep components focused on presentation
- Export functions that components can import

```javascript
// In /src/domains/activities.js
export async function getActivities(userId) {
  const query = `...`;
  const { data, error } = await executeQuery(query, { userId });
  return { data: data?.activities, error };
}

export async function createActivity(activityData) {
  const mutation = `...`;
  return await executeMutation(mutation, activityData);
}

// In your component
import { getActivities, createActivity } from '@/domains/activities';
```

## Error Handling

### User-Facing Errors
```javascript
import { toast } from 'sonner';

try {
  await performOperation();
  toast.success('Operation completed successfully');
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('Failed to complete operation. Please try again.');
}
```

### Component Error Boundaries
- Use error boundaries for critical sections
- Provide fallback UI for errors
- Log errors for debugging

## Performance Considerations

### Optimization Techniques
- Use React.memo for expensive components
- Memoize callbacks with useCallback
- Memoize values with useMemo
- Lazy load routes and heavy components

```javascript
import { lazy, Suspense, memo, useCallback, useMemo } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

const MemoizedComponent = memo(function Component({ data }) {
  const processedData = useMemo(() => expensiveOperation(data), [data]);
  const handleClick = useCallback(() => doSomething(data), [data]);
  
  return <div onClick={handleClick}>{processedData}</div>;
});

// Usage
<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

## Accessibility

### ARIA and Semantic HTML
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- Add ARIA labels when needed
- Ensure keyboard navigation works
- Test with screen readers when possible

```javascript
<button
  type="button"
  aria-label="Close dialog"
  onClick={handleClose}
>
  <X className="h-4 w-4" />
</button>
```

## Testing Frontend (When Added)

### Component Testing Pattern
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('component renders and handles interaction', async () => {
  const handleClick = jest.fn();
  render(<MyComponent onClick={handleClick} />);
  
  const button = screen.getByRole('button', { name: /click me/i });
  await userEvent.click(button);
  
  await waitFor(() => {
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Common Frontend Tasks

### Adding a New Page
1. Create component in `/src/pages/`
2. Add route in `/src/App.jsx` or routing config
3. Add navigation link if needed
4. Test with different user roles

### Adding a New Feature
1. Identify the domain (activity, event, etc.)
2. Add GraphQL operations to domain file
3. Create/update components
4. Add forms with validation if needed
5. Handle loading and error states
6. Test user interactions

### Updating UI Components
1. Check if component exists in `/src/components/ui/`
2. Follow Radix UI patterns for new components
3. Maintain consistent styling with Tailwind
4. Ensure accessibility compliance

## Environment Variables

Access with `import.meta.env`:
```javascript
const backendUrl = import.meta.env.VITE_NHOST_BACKEND_URL;
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Icons and Assets

- Use Lucide React for icons: `import { IconName } from 'lucide-react'`
- Place static assets in `/public/`
- Import images in components for bundling

## Debugging Tips

- Use React DevTools for component inspection
- Check Network tab for API calls
- Use `console.log` sparingly (remove before committing)
- Test in different browsers and screen sizes
