-- Add is_default column to api_key table
ALTER TABLE public.api_key
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Backfill: create a default MCP API Key for every existing user who doesn't have one.
-- Each key gets level-appropriate rate_limit and max_count, with default sources:
-- douyin, weibo, github, toutiao.

DO $$
DECLARE
  u RECORD;
  k_exists TEXT;
  v_rate_limit INTEGER;
  v_max_count INTEGER;
  v_raw_key TEXT;
  v_key_name TEXT;
  v_key_hash TEXT;
  v_key_id TEXT;
BEGIN
  FOR u IN SELECT id, level, COALESCE(NULLIF(nickname, ''), '用户' || id::text) AS display_name FROM public.users LOOP
    -- Check if this user already has a default key
    SELECT id INTO k_exists FROM public.api_key
      WHERE user_id = u.id AND is_default = true
      LIMIT 1;

    IF k_exists IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Determine rate_limit / max_count based on user level
    CASE u.level
      WHEN 0 THEN
        v_rate_limit := 3;
        v_max_count := 5;
      WHEN 1 THEN
        v_rate_limit := 20;
        v_max_count := 10;
      WHEN 2 THEN
        v_rate_limit := -1;
        v_max_count := 50;
      ELSE
        v_rate_limit := 3;
        v_max_count := 5;
    END CASE;

    -- Generate key
    v_key_id := gen_random_uuid()::text;
    v_raw_key := 'knews_' || encode(gen_random_bytes(24), 'hex');
    v_key_name := u.display_name || ' 默认Key';
    v_key_hash := encode(sha256((v_raw_key || 'knews_api_key_salt')::bytea), 'hex');

    INSERT INTO public.api_key (
      id,
      user_id,
      key_hash,
      name,
      is_active,
      is_default,
      source_scope,
      rate_limit,
      max_count,
      call_count,
      created_at,
      updated_at
    ) VALUES (
      v_key_id,
      u.id,
      v_key_hash,
      v_key_name,
      true,
      true,
      '["douyin","weibo","github","toutiao"]',
      v_rate_limit,
      v_max_count,
      0,
      now(),
      now()
    );
  END LOOP;
END;
$$;
