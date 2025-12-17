-- Add moderation columns (soft-delete/redact/hide)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by uuid NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason text NULL,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz NULL,

  ADD COLUMN IF NOT EXISTS is_redacted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redacted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS redacted_reason text NULL,
  ADD COLUMN IF NOT EXISTS redacted_at timestamptz NULL,

  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason text NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Foreign keys to profiles
ALTER TABLE public.messages
  ADD CONSTRAINT IF NOT EXISTS messages_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS messages_redacted_by_fkey FOREIGN KEY (redacted_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Helpful index for filtering
CREATE INDEX IF NOT EXISTS messages_thread_id_created_at_idx
  ON public.messages(thread_id, created_at);
