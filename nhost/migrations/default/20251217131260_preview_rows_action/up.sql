ALTER TABLE public.directory_import_preview_rows
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'upsert'; -- upsert|deactivate

CREATE INDEX IF NOT EXISTS dipr_action_idx
  ON public.directory_import_preview_rows(preview_id, action);
