CREATE OR REPLACE FUNCTION public.increment_api_key_usage(key_id TEXT)
RETURNS VOID AS $$
  UPDATE public.api_key
  SET last_used = now(), call_count = call_count + 1
  WHERE id = key_id;
$$ LANGUAGE sql;
