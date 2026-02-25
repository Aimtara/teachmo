-- Directory fields (Safe Fix)
ALTER TABLE public.school_community_directories DROP CONSTRAINT IF EXISTS scd_created_by_fkey;
ALTER TABLE public.school_community_directories ADD CONSTRAINT scd_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
