# Teachmo

Full-stack starter wired for Nhost with onboarding, role dashboards, and GraphQL helpers.

## Running the app

1. Copy `.env.example` to `.env` and set at minimum:
   - `VITE_NHOST_BACKEND_URL` for your Nhost project
   - `VITE_API_BASE_URL` if you still target REST fallbacks
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Backend (Nhost + Hasura)
- Core schema migration: `nhost/migrations/001_teachmo_core/up.sql`
- Serverless functions: `nhost/functions/health.js`, `nhost/functions/track-event.js`
- Setup docs: `nhost/docs/hasura_setup.md`, `nhost/docs/permissions.md`

Start Nhost locally with `nhost up` and apply migrations; use the docs to track tables and permissions.

## Frontend features
- Auth flow with email/password plus prepared social callback handler (`src/pages/AuthCallback.jsx`).
- Onboarding that writes `profiles`, `organizations`, and `schools` (`/onboarding`).
- Role-based routing for parents, teachers, partners, and admins (`src/pages/index.jsx`).
- Dashboards:
  - Parent (`/parent/dashboard`) with events, activities, and messaging previews.
  - Teacher (`/teacher/dashboard`) for classroom and training tracking.
  - Partner (`/partners/dashboard`) for submissions.
  - Admin (`/admin`) for org/school provisioning and role assignment.
- Messaging, events, activities, children, and partner submission operations organized in `src/domains/**` using the shared GraphQL helper at `src/lib/graphql.js`.

## Building and deploying

```bash
npm run build
```

For Vercel, keep `VITE_NHOST_BACKEND_URL` set in project settings; the included `vercel.json` handles SPA rewrites.
