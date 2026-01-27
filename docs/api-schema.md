# API Schema Documentation

Teachmo uses Hasura GraphQL on top of the Postgres schema in `nhost/migrations`.
The authoritative schema lives in SQL migrations and metadata YAML.

## Source of truth

- **Migrations**: `nhost/migrations/**/up.sql` contain tables, columns, and indexes.
- **Metadata**: `nhost/metadata/databases/default/tables/**` define permissions and relationships.
- **Functions**: serverless GraphQL usage lives in `nhost/functions/**`.

## Key domain tables

| Domain | Tables | Notes |
| --- | --- | --- |
| Users & roles | `profiles`, `organizations`, `schools` | Role and tenant context for app routing. |
| Messaging | `threads`, `messages`, `communications` | Messaging surfaces, notifications, and summaries. |
| Weekly briefs | `weekly_briefs`, `weekly_brief_runs` | LLM summaries and run telemetry. |
| Calendars | `calendar_events` | Source for schedule signals and disruptions. |

## GraphQL usage conventions

- Keep queries/mutations colocated with their feature:
  - Frontend: `src/api/**`, `src/domain/**`
  - Serverless: `nhost/functions/**`
- Prefer smaller response payloads; fetch only the columns you use.
- Use stable input objects for new endpoints so they remain forward‑compatible.

## Typed query and mutation generation

We recommend adopting GraphQL Code Generator for type‑safe operations:

1. Install the tooling:
   ```bash
   npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
   ```
2. Add a `codegen.yml`:
   ```yaml
   schema: ${HASURA_GRAPHQL_URL}
   documents:
     - src/**/*.{ts,tsx,js,jsx}
     - nhost/functions/**/*.{ts,js}
   generates:
     src/api/generated/graphql.ts:
       plugins:
         - typescript
         - typescript-operations
   ```
3. Run `npx graphql-codegen` after changing queries or the schema.

This ensures shared types for GraphQL responses and domain models stay aligned.
