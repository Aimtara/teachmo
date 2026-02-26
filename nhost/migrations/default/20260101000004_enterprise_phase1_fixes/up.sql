CREATE TABLE IF NOT EXISTS public.ai_policy_docs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    summary text,
    content text NOT NULL,
    links jsonb DEFAULT '[]'::jsonb,
    published_at timestamptz,
    organization_id uuid,
    school_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_policy_docs
  ADD COLUMN IF NOT EXISTS body_markdown text;

UPDATE public.ai_policy_docs
SET body_markdown = COALESCE(body_markdown, content)
WHERE body_markdown IS NULL;
