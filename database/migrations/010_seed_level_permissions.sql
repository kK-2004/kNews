INSERT INTO public.settings (key, value) VALUES
  ('level_permissions', '{"0":{"rate_limit":3,"max_count":5},"1":{"rate_limit":20,"max_count":10},"2":{"rate_limit":-1,"max_count":50}}')
ON CONFLICT (key) DO NOTHING;