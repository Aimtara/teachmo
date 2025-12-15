# Permissions starter recipes

## Parents
- Select and update their own `profiles` row.
- Select `children` where `profile_id = X-Hasura-User-Id` or joined via `guardian_children`.
- Select and insert `message_threads` when they are listed in `thread_participants`.
- Select/insert `messages` only for threads they participate in.

## Teachers
- Manage `classrooms` where `teacher_id = X-Hasura-User-Id`.
- Select/insert/update `events` created by them or tied to their classrooms.
- Send and view messages in threads where they are a participant.

## Partners
- Insert and update `partner_submissions` where `partner_id = X-Hasura-User-Id`.
- Select their own submissions for status tracking.

## Admins
- Full access to all tables for system administrators.
- District and school admins can manage `schools`, `classrooms`, and related `profiles` within their scope.

## Notes
- Apply column presets for `profiles.user_id` and `partner_submissions.partner_id` using `X-Hasura-User-Id`.
- Ensure `updated_at` triggers remain enabled after migrations.
