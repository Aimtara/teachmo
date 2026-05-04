# Schema and Metadata CI

Generated: 2026-05-04  
Owner placeholders: Platform, Data, Security

Teachmo now has repository automation for database migrations, Hasura metadata
shape checks, and GraphQL type-generation readiness. The automation is designed
to run safely on pull requests without live Hasura credentials, while protected
staging/production validation fails closed when credentials are required.

## Workflow

Workflow: `.github/workflows/schema-and-metadata.yml`

Triggers:

- `pull_request`
- pushes to `main`
- nightly schedule
- manual `workflow_dispatch`

The workflow:

1. Starts disposable Postgres 15.
2. Bootstraps the local Nhost auth schema:
   - `CREATE SCHEMA IF NOT EXISTS auth`
   - minimal `auth.users` table
3. Installs root and backend dependencies.
4. Runs `npm run check:schema-metadata`.
5. Runs `node backend/migrate.js` against the disposable DB.
6. Uploads JSON and Markdown validation reports.
7. Checks GraphQL codegen configuration.

## Repository validation

Command:

```bash
npm run check:schema-metadata
```

Script:

```bash
node scripts/ops/validate-schema-metadata.mjs
```

The script validates:

- Nhost metadata root files are present.
- `nhost/metadata/databases/default/tables/tables.yaml` is parseable.
- Every referenced table metadata file exists.
- Every table metadata file has a corresponding entry in `tables.yaml`.
- Referenced table names are present in repository migration SQL when feasible.
- Backend migrations are present.
- The known pre-existing duplicate-column migration
  `backend/migrations/20260124_ops_consolidate_and_timeline.sql` is explicitly
  reported as a required manual/CI skip candidate for disposable DB runs.

Reports:

- `artifacts/schema-metadata/schema-metadata.json`
- `artifacts/schema-metadata/schema-metadata.md`

## Migration gotchas

Local disposable DB validation follows the existing two-phase migration model:

1. Nhost migrations bootstrap the base schema.
2. Backend migrations apply downstream schema.

For local/dev CI, bootstrap the auth schema before Nhost migrations:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  display_name text,
  created_at timestamptz DEFAULT now()
);
```

The backend migration `20260124_ops_consolidate_and_timeline.sql` has a known
duplicate-column issue documented in workspace runbooks. If it blocks a
disposable validation run, mark that exact filename as applied in the disposable
`schema_migrations` table and record the skip in the workflow artifact. Do not
silently skip any other migration.

## GraphQL type generation guard

Config: `codegen.yml`

Scripts:

```bash
npm run graphql:codegen
npm run check:graphql-types
```

`codegen.yml` requires:

- `HASURA_GRAPHQL_SCHEMA_URL`
- `HASURA_GRAPHQL_ADMIN_SECRET` or equivalent read-only schema access token

Pull requests without these secrets validate the config file only. Protected
staging/production runs must provide the endpoint and token; generated files
must be committed and `git diff --exit-code src/api/generated/graphql.ts` must
pass.

## Required secrets for live validation

| Secret | Purpose | Required where |
| --- | --- | --- |
| `HASURA_GRAPHQL_SCHEMA_URL` | Schema introspection endpoint | protected schema/typegen runs |
| `HASURA_GRAPHQL_ADMIN_SECRET` | Schema introspection secret | protected schema/typegen runs |
| `DATABASE_URL` | Optional remote staging DB validation | manual staging dispatch |

## Failure policy

- Pull requests fail on repository metadata shape errors, migration errors, and
  malformed codegen config.
- Protected scheduled/manual runs fail when required live validation secrets are
  missing.
- Known migration skips must be named in the report and linked to this document.
