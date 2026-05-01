# Hasura/Nhost Production Readiness Runbook

This runbook separates repository-verifiable readiness from live environment verification.

## Automated repository checks

Run:

```bash
npm run check:hasura-readiness
```

The check verifies that source-controlled metadata, table metadata, migrations, and permission docs are present. It does **not** prove that staging/production Hasura metadata is applied or drift-free.

## Manual live verification

For each staging and production Nhost project:

1. Confirm access to the correct project:
   ```bash
   nhost link
   ```
2. Export remote metadata to a temporary directory.
3. Compare remote metadata with `nhost/metadata`.
4. Apply migrations/metadata using the documented Nhost flow, e.g.:
   ```bash
   nhost up --remote
   ```
5. Validate permissions by role using real test users:
   - parent
   - teacher
   - school_admin
   - district_admin
   - system_admin
   - partner
6. Verify JWT claims include the expected Hasura role and tenant scope fields.
7. Verify CORS/auth redirect URLs match the deployment domains.
8. Capture evidence: command output, screenshots of metadata status, and per-role smoke results.

Do not mark production GO until these steps are complete.
