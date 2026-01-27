---
applies_to:
  - "**/*"
---

# Default Instructions for Teachmo Repository

## Core Principles

1. **Minimal Changes**: Make the smallest possible changes to achieve the goal
2. **Consistency**: Follow existing patterns and conventions in the codebase
3. **Testing**: Write tests for backend changes; validate frontend changes manually
4. **Documentation**: Update docs when changing APIs or architecture
5. **Security**: Never commit secrets; validate all user inputs

## Before Making Changes

1. Read `AGENTS.md` for project context and coding standards
2. Explore related code to understand existing patterns
3. Check for similar implementations in the codebase
4. Review the README for setup and development instructions

## Making Code Changes

### General Guidelines
- Use existing libraries and patterns rather than introducing new dependencies
- Match the code style of surrounding code
- Add comments only when necessary for complex logic
- Validate that changes don't break existing functionality

### React/Frontend Changes
- Use functional components with hooks
- Add PropTypes for component props
- Import shared components from `/src/components/ui/`
- Use the GraphQL helper from `/src/lib/graphql.js`
- Follow Tailwind CSS utility patterns for styling
- Handle loading, error, and success states in UI

### Backend Changes
- Write tests in `__tests__/` or as `*.test.js` files
- Use Jest + Supertest for API testing
- Mock database calls with `jest.mock('../db.js')`
- Validate inputs and handle errors gracefully
- Use parameterized queries for SQL

### Database/Schema Changes
- Create migrations in `/nhost/migrations/`
- Document schema changes in migration files
- Update Hasura permissions as needed
- Test migrations before committing

## Running the Code

### Development Server
```bash
npm install
npm run dev
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

### Backend Tests
```bash
cd backend && npm test
```

## Common Patterns

### GraphQL Operations
Use the shared helper for consistency:
```javascript
import { executeQuery, executeMutation } from '../lib/graphql.js';

const QUERY = `
  query GetItems {
    items {
      id
      name
    }
  }
`;

const { data, error } = await executeQuery(QUERY);
```

### Form Handling
Use React Hook Form with Zod validation:
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### Error Handling
```javascript
try {
  const result = await someOperation();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error message
}
```

## File Organization

- **Components**: Place in `/src/components/` (shared) or near usage (page-specific)
- **Domain Logic**: Add to appropriate file in `/src/domains/`
- **Pages**: Create in `/src/pages/` and update routing
- **Backend Routes**: Add to `/backend/routes/`
- **Tests**: Place in `/backend/__tests__/` or as `*.test.js`

## What to Avoid

❌ Don't introduce new dependencies without justification  
❌ Don't bypass the GraphQL helper for data fetching  
❌ Don't skip PropTypes on React components  
❌ Don't hardcode configuration values  
❌ Don't commit `.env` files or secrets  
❌ Don't modify working code unnecessarily  
❌ Don't skip error handling  
❌ Don't forget to run linting before finalizing

## Getting Help

- Check `AGENTS.md` for detailed guidance
- Review `README.md` for setup instructions
- Look at existing code for patterns
- Check domain files in `/src/domains/` for examples
- Review test files for testing patterns
