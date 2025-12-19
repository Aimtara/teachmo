DROP INDEX IF EXISTS public.message_blocks_blocker_idx;
DROP INDEX IF EXISTS public.message_blocks_blocked_idx;
DROP INDEX IF EXISTS public.message_reports_message_idx;
DROP INDEX IF EXISTS public.message_reports_reporter_idx;
DROP TABLE IF EXISTS public.message_blocks;
DROP TABLE IF EXISTS public.message_reports;
DROP TABLE IF EXISTS public.rate_limits;
