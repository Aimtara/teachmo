# Hasura setup checklist

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
