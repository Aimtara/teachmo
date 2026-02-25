-- Message threads constraints (Safe Fix)
ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_request_fk;
ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_request_fk FOREIGN KEY (request_id) REFERENCES public.message_requests(id) ON DELETE SET NULL;

ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_school_requester_target_key;
ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_school_requester_target_key UNIQUE (school_id, requester_id, target_id);
