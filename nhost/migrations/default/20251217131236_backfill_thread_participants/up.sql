INSERT INTO public.message_thread_participants (thread_id, user_id, role)
SELECT tp.thread_id, p.user_id, 'member'
FROM public.thread_participants tp
JOIN public.profiles p ON p.id = tp.profile_id
JOIN auth.users u ON u.id = p.user_id
ON CONFLICT (thread_id, user_id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'message_threads'
      AND column_name = 'created_by'
  ) THEN
    INSERT INTO public.message_thread_participants (thread_id, user_id, role)
    SELECT t.id, t.created_by, 'owner'
    FROM public.message_threads t
    WHERE t.created_by IS NOT NULL
      AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END IF;
END $$;
