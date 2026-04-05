CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.settings (key, value) VALUES
  ('github_client_id', 'Ov23liAXX9wYsya66tHB')
ON CONFLICT (key) DO NOTHING;
