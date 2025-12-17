-- Drop constraints first
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_hidden_by_fkey,
  DROP CONSTRAINT IF EXISTS messages_redacted_by_fkey,
  DROP CONSTRAINT IF EXISTS messages_deleted_by_fkey;

-- Drop index
DROP INDEX IF EXISTS public.messages_thread_id_created_at_idx;

-- Drop columns
ALTER TABLE public.messages
  DROP COLUMN IF EXISTS is_hidden,
  DROP COLUMN IF EXISTS hidden_by,
  DROP COLUMN IF EXISTS hidden_reason,
  DROP COLUMN IF EXISTS hidden_at,

  DROP COLUMN IF EXISTS is_redacted,
  DROP COLUMN IF EXISTS redacted_by,
  DROP COLUMN IF EXISTS redacted_reason,
  DROP COLUMN IF EXISTS redacted_at,

  DROP COLUMN IF EXISTS is_deleted,
  DROP COLUMN IF EXISTS deleted_by,
  DROP COLUMN IF EXISTS deleted_reason,
  DROP COLUMN IF EXISTS deleted_at;
