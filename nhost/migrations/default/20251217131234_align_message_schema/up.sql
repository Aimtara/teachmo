-- Align message schema (Safe Fix)
ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_created_by_fkey;
ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
