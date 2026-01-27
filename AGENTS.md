# Teachmo - GitHub Copilot Instructions

## Project Overview

Teachmo is a full-stack educational platform built with React, Vite, and Nhost (GraphQL + Hasura). It provides role-based dashboards for parents, teachers, partners, and admins with features for managing organizations, schools, activities, events, and messaging.

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router v7
- **State Management**: Zustand
- **Styling**: Tailwind CSS + Radix UI components
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: Nhost React SDK with GraphQL

### Backend
- **BaaS**: Nhost (PostgreSQL + Hasura GraphQL)
- **Serverless Functions**: Nhost Functions (Node.js)
- **REST API**: Express.js (in `/backend`)
- **Database**: PostgreSQL via Nhost

### Testing
- **Backend Tests**: Jest + Supertest
- **Frontend Tests**: Testing Library (when added)
- **Linting**: ESLint with React plugin

## Architecture Patterns

### Frontend Architecture
- **Domain-Driven Organization**: Code is organized by domain in `/src/domains/` (activities, auth, children, events, messaging, onboarding, submissions)
- **Shared GraphQL Helper**: Use `/src/lib/graphql.js` for all GraphQL operations
- **Component Library**: Radix UI components in `/src/components/ui/`
- **Role-Based Routing**: Different dashboards for each user role (parent, teacher, partner, admin)

### Backend Architecture
- **GraphQL First**: Primary data operations through Hasura GraphQL
- **REST Fallback**: Express routes in `/backend/routes/` for legacy/specific operations
- **Serverless Functions**: Nhost functions in `/nhost/functions/` for backend logic
- **Database Migrations**: SQL migrations in `/nhost/migrations/`

## Coding Standards

### JavaScript/React Conventions
- Use ES6+ modern JavaScript features
- Prefer functional components with hooks over class components
- Use PropTypes for component prop validation
- Follow React Hooks rules (order, conditional usage)
- Component files should be named with PascalCase (e.g., `DashboardCard.jsx`)
- Domain logic files use camelCase (e.g., `activities.js`)

### Code Style
- Use 2-space indentation
- Single quotes for strings (enforced by ESLint)
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Max line length: 100 characters when reasonable

### Testing Guidelines
- Write unit tests for backend routes using Jest + Supertest
- Mock database calls with `jest.mock('../db.js')`
- Test files should be named `*.test.js` or placed in `__tests__/` directory
- Follow existing test patterns in `/backend/__tests__/assignments.test.js`

### GraphQL Conventions
- Use the shared helper in `/src/lib/graphql.js` for queries/mutations
- Define GraphQL operations close to where they're used
- Use fragments for reusable field selections
- Handle loading and error states consistently

### File Organization
- **Components**: `/src/components/` - Shared UI components
- **Pages**: `/src/pages/` - Route components
- **Domains**: `/src/domains/` - Business logic grouped by feature
- **Hooks**: `/src/hooks/` - Custom React hooks
- **Utils**: `/src/utils/` - Helper functions
- **API**: `/src/api/` - API client utilities
- **Config**: `/src/config/` - Configuration files

## Development Workflow

### Running the Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Backend Development
```bash
# Start Nhost locally
nhost up

# Backend tests (from /backend directory)
cd backend && npm test
```

### Common Tasks

#### Adding a New Feature
1. Identify the domain (activity, event, messaging, etc.)
2. Add GraphQL operations to the domain file in `/src/domains/`
3. Create/update components in `/src/components/`
4. Add routes/pages as needed in `/src/pages/`
5. Update backend routes if REST endpoints are needed
6. Write tests for backend routes

#### Adding a New Database Table
1. Create migration in `/nhost/migrations/`
2. Define Hasura permissions in migration or console
3. Add GraphQL operations in relevant domain file
4. Update TypeScript types if applicable

#### Adding a New UI Component
1. Follow Radix UI patterns for accessible components
2. Use Tailwind CSS for styling
3. Place shared components in `/src/components/ui/`
4. Use existing design tokens from `tailwind.config.js`

## Dependencies & Libraries

### Key Dependencies
- `@nhost/react`, `@nhost/nhost-js` - Nhost SDK
- `react-router-dom` - Routing
- `zustand` - State management
- `react-hook-form` + `zod` - Forms and validation
- `@radix-ui/*` - Accessible UI components
- `lucide-react` - Icons
- `date-fns` - Date utilities
- `framer-motion` - Animations

### Adding New Dependencies
- Prefer existing libraries when possible
- Ensure compatibility with React 18
- Check bundle size impact for frontend dependencies
- Document why the dependency is needed

## Security & Best Practices

### Authentication
- Use Nhost authentication system
- Handle auth state with `@nhost/react` hooks
- Protect routes based on user roles
- Never expose sensitive tokens in client code

### Data Validation
- Validate all user inputs with Zod schemas
- Sanitize HTML content with DOMPurify
- Use parameterized queries for database operations
- Validate permissions on both frontend and backend

### Error Handling
- Provide user-friendly error messages
- Log errors appropriately (avoid sensitive data)
- Handle loading states gracefully
- Use try-catch blocks for async operations

## Environment Configuration

Required environment variables (see `.env.example`):
- `VITE_NHOST_BACKEND_URL` - Nhost backend URL
- `VITE_API_BASE_URL` - REST API base URL (if needed)

## Documentation

- Main README: `/README.md`
- Backend README: `/backend/README.md`
- Hasura setup: `/nhost/docs/hasura_setup.md`
- Permissions guide: `/nhost/docs/permissions.md`
- Migration notes: `/MIGRATION_NOTES.md`

## Git & Pull Request Guidelines

### Commit Messages
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep first line under 72 characters
- Add detailed description in body if needed

### Pull Requests
- Reference related issues
- Describe what changed and why
- Include testing steps
- Update documentation if needed
- Ensure all tests pass and linting is clean

## Common Pitfalls to Avoid

1. **Don't bypass GraphQL**: Use `/src/lib/graphql.js` for consistency
2. **Don't skip PropTypes**: All components should validate props
3. **Don't hardcode URLs**: Use environment variables
4. **Don't forget error handling**: Always handle loading, error, and success states
5. **Don't mix concerns**: Keep business logic in domain files, not components
6. **Don't ignore linting**: Run `npm run lint` before committing
7. **Don't commit secrets**: Check `.env` is in `.gitignore`
8. **Don't modify working code unnecessarily**: Make minimal, surgical changes

## Useful Commands Reference

```bash
# Development
npm run dev                  # Start dev server
npm run build               # Production build
npm run lint                # Run ESLint
npm run preview             # Preview production build

# Backend (from /backend)
npm test                    # Run backend tests
node index.js               # Start Express server

# Nhost
nhost up                    # Start local Nhost
nhost down                  # Stop local Nhost
```

## Task Preferences for Copilot

### Good Tasks for Copilot
- Fixing bugs in existing code
- Adding new UI components following existing patterns
- Creating new GraphQL operations in domain files
- Writing tests for backend routes
- Updating documentation
- Refactoring for code quality
- Adding form validation with Zod
- Implementing new dashboard features

### Tasks Requiring Human Review
- Database schema changes (migrations)
- Hasura permission configuration
- Authentication flow changes
- Major architectural decisions
- Security-sensitive code
- Production configuration changes

## Support & Resources

- Nhost Documentation: https://docs.nhost.io/
- Hasura GraphQL: https://hasura.io/docs/
- React Documentation: https://react.dev/
- Radix UI Components: https://www.radix-ui.com/
- Tailwind CSS: https://tailwindcss.com/
