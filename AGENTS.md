# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Teachmo is a full-stack EdTech platform with:
- **Frontend**: React SPA (Vite, port 5173) — `npm run dev`
- **Backend**: Express API (port 4000) — `cd backend && npm run dev`
- **Database**: PostgreSQL 15 (Docker, port 5432) — `docker compose -f backend/docker-compose.yml up -d db`

### Starting services

1. Start Docker daemon: `dockerd &>/var/log/dockerd.log &` (wait ~3s)
2. Start PostgreSQL: `docker compose -f backend/docker-compose.yml up -d db`
3. Run migrations: `cd backend && node migrate.js`
4. Start backend: `cd backend && npm run dev` (port 4000)
5. Start frontend: `npm run dev` (port 5173, proxies `/api` to backend)

### Database setup gotcha

The backend migration system has a two-phase approach. It first bootstraps the Nhost schema from `nhost/migrations/`, then applies `backend/migrations/`. The Nhost migrations require an `auth` schema (normally provided by Nhost). For local dev without `nhost up`, create it manually before running migrations:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, display_name text, created_at timestamptz DEFAULT now());
```

Migration `20260124_ops_consolidate_and_timeline.sql` has a pre-existing duplicate column bug and must be skipped (mark applied manually if needed).

### Lint & test commands

- **Lint**: `npx eslint src backend --ext .js,.jsx,.ts,.tsx` (pre-existing lint errors in repo; ESLint 9 flat config)
- **Vitest (frontend)**: `npx vitest run` (163 suites pass; some pre-existing failures)
- **Jest (backend)**: `npx jest --config jest.backend.config.cjs` (30 suites, 186 tests all pass)
- **Backend-specific tests**: `cd backend && npm test`
- **E2E**: `npx playwright test` (requires running app + Playwright browsers; the update script runs `npx playwright install --with-deps chromium` automatically; 7 tests fail due to pre-existing disabled features, 15 pass, 5 skipped)

### Environment variables

- Copy `.env.example` → `.env` and `backend/.env.example` → `backend/.env`
- Backend defaults: `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=teachmo`
- Auth env vars (`AUTH_JWKS_URL`, `NHOST_ADMIN_SECRET`) are optional for basic startup; backend logs warnings but runs

### Docker in Cloud Agent VMs

The VM requires special Docker configuration:
- Storage driver: `fuse-overlayfs`
- iptables: must use legacy mode (`iptables-legacy`)
- Daemon config at `/etc/docker/daemon.json`

### Node.js version

The project requires Node.js 20 (see `.nvmrc`). Install via nodesource if not present.
