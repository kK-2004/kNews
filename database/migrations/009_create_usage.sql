CREATE TABLE IF NOT EXISTS public.usage (
  id TEXT PRIMARY KEY,
  api_key_id TEXT REFERENCES public.api_key(id),
  hour TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usage_api_key_hour_unique UNIQUE (api_key_id, hour)
);

CREATE OR REPLACE FUNCTION public.increment_usage(key_id TEXT, hour_str TEXT)
RETURNS VOID AS $$
  INSERT INTO public.usage (id, api_key_id, hour, call_count)
  VALUES (gen_random_uuid()::text, key_id, hour_str, 1)
  ON CONFLICT (api_key_id, hour)
  DO UPDATE SET call_count = public.usage.call_count + 1, updated_at = now();
$$ LANGUAGE sql;