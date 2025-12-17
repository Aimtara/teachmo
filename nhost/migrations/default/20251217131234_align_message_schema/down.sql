ALTER TABLE public.message_threads
  DROP CONSTRAINT IF EXISTS message_threads_created_by_fkey;

ALTER TABLE public.message_threads
  DROP COLUMN IF EXISTS last_message_preview,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS title;

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS body;
