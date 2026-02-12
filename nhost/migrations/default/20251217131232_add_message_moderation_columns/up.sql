-- Add moderation columns (Split into individual safe statements)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hidden_by uuid NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hidden_reason text NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hidden_at timestamptz NULL;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_redacted boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS redacted_by uuid NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS redacted_reason text NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS redacted_at timestamptz NULL;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_reason text NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Foreign keys (Using DROP+ADD pattern to ensure compatibility and idempotency)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_hidden_by_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_redacted_by_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_redacted_by_fkey FOREIGN KEY (redacted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_deleted_by_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Helpful index for filtering
CREATE INDEX IF NOT EXISTS messages_thread_id_created_at_idx ON public.messages(thread_id, created_at);
