CREATE TABLE IF NOT EXISTS public.source (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  category TEXT,
  enabled BOOLEAN DEFAULT true,
  config TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
