-- Invite delivery fields (Safe Fix)
ALTER TABLE public.message_thread_invites DROP CONSTRAINT IF EXISTS message_thread_invites_revoked_by_fkey;
ALTER TABLE public.message_thread_invites ADD CONSTRAINT message_thread_invites_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
