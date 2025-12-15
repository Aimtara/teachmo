# Hasura setup checklist

1. Start Nhost locally (`nhost up`) and open the Hasura console.
2. Track the following tables under the `public` schema:
   - organizations, schools, profiles
   - children, guardian_children
   - classrooms, classroom_students
   - message_threads, thread_participants, messages
   - events
   - activities, library_items
   - partner_submissions
   - event_log
3. Track relationships:
   - organizations → schools (one-to-many)
   - schools → classrooms (one-to-many)
   - profiles → children (one-to-many) and children → guardian_children (one-to-many)
   - classrooms → classroom_students (one-to-many)
   - message_threads → thread_participants and messages (one-to-many)
   - profiles → message_threads via thread_participants
   - activities → library_items (one-to-many)
4. Enable row-level permissions:
   - Parents: own profile, own children, message threads they participate in.
   - Teachers: classes they teach, events they create.
   - Partners: submissions they authored.
   - Admins: full access.
5. Verify event triggers for `updated_at` fields are present.
