# Copilot Instructions for Teachmo

## Project Overview

Teachmo is a full-stack education platform built with React, Vite, Nhost (Hasura GraphQL + PostgreSQL), and TypeScript/JavaScript. The application provides role-based dashboards for parents, teachers, partners, and administrators to manage educational activities, messaging, events, and district-level insights.

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript/JavaScript
- **Backend**: Nhost (Hasura GraphQL, PostgreSQL), Express serverless functions
- **Styling**: Tailwind CSS, Radix UI components
- **State Management**: Zustand, TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Testing**: Jest, Playwright, React Testing Library, Vitest
- **Build Tools**: Vite, Babel
- **Linting**: ESLint

## Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start Vite dev server
- `nhost up` - Start Nhost backend locally

### Building
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run preview` - Preview production build

### Testing
- `npm run test` - Run Jest tests
- `npm run test:backend` - Run backend tests only
- `npm run test:watch` - Run tests in watch mode
- `npm run test:a11y` - Run accessibility tests
- `npm run e2e` - Run Playwright E2E tests
- `npm run e2e:a11y` - Run E2E accessibility tests
- `npm run e2e:ui` - Run E2E tests in UI mode

### Linting & Type Checking
- `npm run lint` - Lint specific files
- `npm run lint:barrel` - Check for barrel file issues
- `npm run typecheck` - Run TypeScript type checking

### Other
- `npm run storybook` - Start Storybook
- `npm run backend:check` - Check backend syntax

## Project Structure

### Frontend (`/src`)
- `pages/` - Route components organized by role (parent, teacher, partner, admin)
- `components/` - Reusable UI components
- `domains/` - Business logic organized by domain (messaging, events, activities, etc.)
- `hooks/` - Custom React hooks
- `lib/` - Shared utilities and helpers (GraphQL helper at `src/lib/graphql.ts`)
- `contexts/` - React contexts
- `providers/` - React providers
- `api/` - API client configurations
- `security/` - Security utilities
- `observability/` - Monitoring and telemetry
- `i18n.tsx` - Internationalization setup

### Backend (`/backend`)
- `routes/` - Express route handlers
- `middleware/` - Express middleware
- `models.js` - Data models
- `ai/` - AI/LLM integration logic
- `jobs/` - Background jobs
- `orchestrator/` - Workflow orchestration
- `security/` - Security utilities
- `migrations/` - Database migrations
- `__tests__/` - Backend tests

### Nhost (`/nhost`)
- `migrations/` - Hasura database migrations
- `functions/` - Serverless functions (TypeScript)
- `docs/` - Backend documentation (permissions, Hasura setup, etc.)

### Documentation (`/docs`)
- `contributor-guidelines.md` - Coding standards and UX guidelines
- `api-schema.md` - GraphQL schema documentation
- `events-workflows.md` - Events and workflows guide
- `security.md` & `SECURITY.md` - Security documentation
- `ai-transparency.md` & `AI_TRANSPARENCY.md` - AI usage transparency
- `adr/` - Architecture Decision Records

## Coding Standards

### General
- **TypeScript preferred** for shared logic, serverless functions, and new components
- **Avoid `try/catch` around imports** (per project linting standards)
- Use **shared helpers** in `src/lib` and `nhost/functions/_shared` to reduce duplication
- **No PII in server logs** - ensure logs are actionable and privacy-safe
- Use **existing libraries** whenever possible; only add new dependencies if necessary
- Follow **existing code style** and patterns in the codebase

### GraphQL Patterns
- Keep **GraphQL queries near their usage**
- **Avoid overfetching** - request only needed fields
- Use the shared GraphQL helper at `src/lib/graphql.ts`
- Organize GraphQL operations in `src/domains/**` by business domain
- See `docs/api-schema.md` for schema documentation and typed operation generation

### Component Development
- Use **Radix UI** for accessible component primitives
- Leverage **Tailwind CSS** for styling with `tailwind-merge` and `clsx` utilities
- Use **class-variance-authority** for component variants
- Follow **accessibility best practices**: keyboard navigation, labels, focus states
- Add **test IDs** for complex flows instead of brittle selectors

### Forms
- Use **React Hook Form** for form management
- Use **Zod** for schema validation
- Integrate with `@hookform/resolvers` for validation

### State Management
- Use **Zustand** for global state
- Use **TanStack Query** (React Query) for server state
- Keep state as close to where it's used as possible

## Testing Expectations

### Unit Tests
- **Required for new business logic**: LLM prompts, date logic, data transforms
- Use **Jest** for unit tests
- Use **React Testing Library** for component tests
- Mock external dependencies appropriately
- See `setupTests.js` for Jest setup

### Accessibility Tests
- Run **jest-axe** tests for new components
- Run **Playwright accessibility tests** for E2E flows
- Ensure keyboard navigation works
- Verify screen reader support

### E2E Tests
- **Required for role-based routing** and admin flows
- Use **Playwright** for E2E tests
- Test critical user journeys
- Include accessibility checks with `@axe-core/playwright`

### Test Organization
- Frontend tests: `src/**/__tests__/`
- Backend tests: `backend/__tests__/`
- E2E tests: `tests/e2e/`

## UX Guidelines

### Content & Tone
- Use **calm, supportive language** for parent-facing content
- **Reduce cognitive load**: shorter paragraphs, clear headings, whitespace
- **Avoid directive phrasing** ("remember to", "make sure") in AI outputs
- Be clear and concise

### User Experience
- Provide **clear loading states**
- Show **offline states** and handle network errors gracefully
- **Prioritize accessibility**: keyboard navigation, ARIA labels, focus management
- Use **semantic HTML**

### Design System
- Follow **Radix UI** patterns for interactive components
- Use **Tailwind CSS** utility classes
- Maintain **consistent spacing** and typography
- Support **dark mode** via `next-themes`

## Git Workflow

### Branches
- Work on feature branches
- Follow conventional naming: `feature/`, `fix/`, `docs/`, etc.

### Commits
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Reference issue numbers when applicable

## Security

### Best Practices
- **No secrets in code** - use environment variables
- **Sanitize user input** - use DOMPurify for HTML content
- **Validate all inputs** - use Zod schemas
- **Follow principle of least privilege** in database permissions
- Review `docs/security.md` and `docs/SECURITY.md` for guidelines

### Authentication & Authorization
- Uses **Nhost authentication** (email/password, social providers)
- **Role-based access control** (RBAC) defined in `backend/rbac.js`
- Protected routes with `src/components/shared/ProtectedRoute.tsx`
- Admin-only routes with `src/components/shared/AdminRoleGuard.tsx`

## AI & LLM Integration

- AI logic in `backend/ai/` and `nhost/functions/`
- Follow **AI transparency guidelines** in `docs/ai-transparency.md` and `docs/AI_TRANSPARENCY.md`
- Review AI governance policies in `src/pages/AdminAIGovernance.jsx`
- Ensure **fairness controls** for AI-generated content

## Observability & Monitoring

- Sentry integration for error tracking (`@sentry/react`)
- Observability utilities in `src/observability/`
- Metrics collection in `backend/metrics.js`
- Web Vitals tracking with `web-vitals`

## Boundaries & Protected Areas

### Do Not Modify (unless explicitly required)
- `.github/workflows/` - CI/CD workflows (ask before changing)
- `nhost/migrations/` - Database migrations (use proper migration process)
- `dist/` - Build output directory
- `node_modules/` - Dependencies
- `.env` - Environment variables (use `.env.example` as reference)

### Caution Required
- `backend/rbac.js` - Role-based access control (security-sensitive)
- `backend/security/` - Security utilities (requires careful review)
- Database schema changes - always create proper migrations
- Authentication flows - test thoroughly

## Common Patterns

### GraphQL Queries
```typescript
// Use the shared GraphQL helper
import { graphqlRequest } from 'src/lib/graphql.ts';

const query = `
  query GetProfile($userId: uuid!) {
    profiles(where: {user_id: {_eq: $userId}}) {
      id
      display_name
    }
  }
`;

const result = await graphqlRequest({ query, variables: { userId } });

// Alternative: use the graphql function with positional arguments
import { graphql } from 'src/lib/graphql.ts';
const result2 = await graphql(query, { userId });
```

### Component Structure
```jsx
// TypeScript component with proper typing
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### Form Handling
```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    // Handle form submission
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

## Additional Resources

- **Main README**: `/README.md`
- **Contributor Guidelines**: `/docs/contributor-guidelines.md`
- **API Schema**: `/docs/api-schema.md`
- **Events & Workflows**: `/docs/events-workflows.md`
- **Security Documentation**: `/docs/security.md`, `/docs/SECURITY.md`
- **AI Transparency**: `/docs/ai-transparency.md`, `/docs/AI_TRANSPARENCY.md`
- **Nhost Setup**: `/nhost/docs/hasura_setup.md`
- **Permissions**: `/nhost/docs/permissions.md`
- **Backend README**: `/backend/README.md`

## Tips for Effective Contributions

1. **Read relevant documentation** before making changes
2. **Run tests** before and after your changes
3. **Test accessibility** with keyboard navigation and screen readers
4. **Check for existing patterns** before creating new ones
5. **Keep changes minimal** and focused
6. **Update documentation** when adding new features
7. **Consider all user roles** (parent, teacher, partner, admin) when making changes
8. **Test offline behavior** for PWA features
9. **Verify mobile responsiveness**
10. **Review security implications** of your changes
