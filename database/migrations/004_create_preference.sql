CREATE TABLE IF NOT EXISTS public.preference (
  id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id),
  data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
