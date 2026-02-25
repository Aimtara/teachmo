-- Link preview to approval (Safe Fix)
ALTER TABLE public.directory_import_previews DROP CONSTRAINT IF EXISTS dip_approval_fkey;
ALTER TABLE public.directory_import_previews ADD CONSTRAINT dip_approval_fkey FOREIGN KEY (approval_id) REFERENCES public.directory_import_approvals(id) ON DELETE SET NULL;
