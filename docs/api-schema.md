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

GraphQL Code Generator is configured in `codegen.yml` and writes shared schema
and operation types to `src/api/generated/graphql.ts`.

Required environment:

- `HASURA_GRAPHQL_ENDPOINT` preferred, or `HASURA_GRAPHQL_URL` as a fallback.
- `HASURA_GRAPHQL_ADMIN_SECRET` or an equivalent read-only introspection secret.

Commands:

```bash
npm run graphql:codegen
npm run check:graphql-types
```

`check:graphql-types` regenerates the file and fails if the committed generated
types are stale. CI skips live generation on untrusted pull requests without
schema secrets, but scheduled/protected schema checks can fail closed when live
type generation is required.
