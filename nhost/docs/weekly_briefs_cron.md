# Weekly Briefs Cron (Pilot)

This MVP ships with a manual admin trigger (`/admin/weekly-briefs`) and a serverless function job:

- Function: `generate-weekly-briefs` (admin-only)
- Run log: `weekly_brief_runs`

## Recommended Pilot Setup

### Option A: Keep it manual (fastest)
Use the Admin page to run **Dry run** first, then **Generate & publish**.

### Option B: Add a weekly cron (production-ish)
Schedule an HTTP POST to your Nhost function endpoint once per week.

#### 1) Create a "service admin" user
Create an admin user (role: `system_admin`) and store its JWT as a secret in your scheduler.

#### 2) Call the function
Send:
- Method: POST
- Headers:
  - `Authorization: Bearer <ADMIN_JWT>`
  - `Content-Type: application/json`
- Body:
  - `{ "trigger": "cron" }`
  - Optionally: `{ "weekStart": "YYYY-MM-DD", "trigger": "cron" }`

Example:
```bash
curl -X POST "$NHOST_FUNCTION_URL/v1/functions/generate-weekly-briefs" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"cron"}'
```

## GitHub Actions Example (Cron)

Create `.github/workflows/weekly_briefs.yml`:

```yaml
name: Generate weekly briefs
on:
  schedule:
    - cron: "0 10 * * 1" # Mondays 10:00 UTC (adjust)
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Call generate-weekly-briefs
        run: |
          curl -sS -X POST "${{ secrets.WEEKLY_BRIEF_FUNCTIONS_URL }}/v1/functions/generate-weekly-briefs" \
            -H "Authorization: Bearer ${{ secrets.WEEKLY_BRIEF_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"trigger":"cron"}'
```


### Option C: Nhost-native scheduler (recommended when available)
Use the `schedule` block in `nhost/config.yaml` (tracked in this repo) to run:

- `name`: `generate_weekly_briefs`
- `cron`: `0 6 * * 1`
- `action`: `/generate-weekly-briefs`

Adjust the cron expression as needed for your district timezone/SLA.

## Observability

- Admin UI shows the most recent run.
- `weekly_brief_runs` stores status, generated_count, and any error message.
