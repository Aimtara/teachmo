# Hasura setup checklist

## 0) Configure Hasura (recommended)

This repo includes a starter `nhost/nhost.toml` in the Nhost project folder that configures
Hasura settings (CORS, console/dev mode defaults, JWT secret placeholder, etc.).

Update **secrets** (admin secret, webhook secret, JWT secret) in the Nhost
dashboard (or your CI secrets) — do not commit real secrets to Git.


## 0.1) Configure runtime environment variables (required)

Before running `nhost up` (and again in Nhost Cloud), set the function/runtime secrets used by this codebase:

- **AI provider**: `OPENAI_API_KEY` (optional model override: `OPENAI_MODEL`)
- **Clever integration**: `CLEVER_CLIENT_ID`, `CLEVER_CLIENT_SECRET`
- **Google integration**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Canvas integration**: `CANVAS_CLIENT_ID`, `CANVAS_CLIENT_SECRET`
- **Server-side Hasura access**: `NHOST_ADMIN_SECRET` (or `HASURA_GRAPHQL_ADMIN_SECRET`)

Use local `.env` values for development and set the same keys in the Nhost Dashboard for production.

## 0.2) Configure scheduled jobs (upstream trigger)

`generate-weekly-briefs` exists as a function, but it must be scheduled to run automatically.

- Add a cron schedule in `nhost/config.yaml` (or configure the equivalent in Nhost Dashboard).
- The repo now includes a starter schedule entry.
- Confirm cadence against `nhost/docs/weekly_briefs_cron.md` before production rollout.

## 0.3) Configure database event triggers (downstream workflow handoff)

If business workflows depend on insert/update database events, define and track Hasura `event_triggers` in metadata.

- `public_partner_submissions` now includes a starter `event_triggers` block in metadata.
- Set `PARTNER_SUBMISSION_EVENT_WEBHOOK` and `HASURA_EVENT_WEBHOOK_SECRET` so Hasura can deliver events to the workflow function endpoint.
- If these env vars are missing, downstream automation will not fire even though metadata is present.

The steps below mirror the actions requested in the Nhost and Hasura dashboards so the UI can load without authorization errors.

1) **Apply the core schema**

   - In **Nhost Dashboard → Database → SQL**, run `nhost/migrations/001_teachmo_core/up.sql` to create all tables.

2) **Track tables (Hasura → Data)**

   Track the following tables under the `public` schema:

   - organizations, schools, profiles
   - children, guardian_children
   - classrooms, classroom_students
   - message_threads, thread_participants, messages
   - events
   - activities, library_items
   - partner_submissions
   - event_log

3) **Create relationships (Hasura suggestions)**

   Accept the recommended relationships Hasura surfaces from foreign keys, which should include:

   - organizations → schools (one-to-many)
   - schools → classrooms (one-to-many)
   - profiles → children (one-to-many) and children → guardian_children (one-to-many)
   - classrooms → classroom_students (one-to-many)
   - message_threads → thread_participants and messages (one-to-many)
   - profiles → message_threads via thread_participants
   - activities → library_items (one-to-many)

4) **Permissions**

   Apply the starter role policies from [`nhost/docs/permissions.md`](./permissions.md) so parent/teacher flows function. Key expectations:

   - Parents can read/update their profile, their children, and threads they participate in.
   - Teachers can manage their classrooms, events they created, and threads they join.
   - Partners manage their own submissions; admins have unrestricted access.

5) **Triggers**

   Verify event triggers for `updated_at` columns remain enabled after tracking.
