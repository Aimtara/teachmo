ALTER TABLE public.ai_policy_docs
  ADD COLUMN IF NOT EXISTS body_markdown text;

UPDATE public.ai_policy_docs
SET body_markdown = COALESCE(body_markdown, content)
WHERE body_markdown IS NULL;
