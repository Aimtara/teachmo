# Live Hasura Permission Smoke Evidence Template

## Run metadata

- Environment:
- Nhost project ID:
- Hasura endpoint:
- Commit SHA:
- Date/time:
- Operator:

## Command

```bash
REQUIRE_HASURA_SMOKE=true \
HASURA_GRAPHQL_ENDPOINT=... \
TEST_JWT_TEACHER=... \
TEST_JWT_DISTRICT_ADMIN=... \
npm run smoke:hasura-permissions
```

## Role matrix evidence

| Role | Allowed reads verified | Forbidden reads verified | Allowed writes verified | Forbidden writes verified | Tenant isolation verified | Evidence link |
| --- | --- | --- | --- | --- | --- | --- |
| anonymous |  |  |  |  |  |  |
| authenticated user |  |  |  |  |  |  |
| parent/guardian |  |  |  |  |  |  |
| teacher |  |  |  |  |  |  |
| partner |  |  |  |  |  |  |
| admin |  |  |  |  |  |  |
| ops/system_admin |  |  |  |  |  |  |

## Result

- [ ] Pass
- [ ] Fail

## Follow-ups

