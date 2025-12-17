ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS last_message_preview text;

ALTER TABLE public.message_threads
  ADD CONSTRAINT IF NOT EXISTS message_threads_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.message_threads
SET title = COALESCE(title, subject)
WHERE title IS NULL AND subject IS NOT NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS body text;

UPDATE public.messages
SET body = content
WHERE body IS NULL AND content IS NOT NULL;
