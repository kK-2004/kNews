CREATE TABLE IF NOT EXISTS public.api_key (
  id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id),
  key_hash TEXT UNIQUE,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  source_scope TEXT,
  rate_limit INTEGER,
  max_count INTEGER,
  last_used TIMESTAMPTZ,
  call_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
