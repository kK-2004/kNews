CREATE TABLE IF NOT EXISTS cache (
  id TEXT PRIMARY KEY,
  updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT,
  login TEXT,
  is_blacklisted INTEGER DEFAULT 0,
  type TEXT,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS preference (
  user_id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_key (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_plaintext TEXT,
  name TEXT,
  source_ids TEXT DEFAULT '[]',
  max_count INTEGER DEFAULT 12,
  rate_limit_rph INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  last_used INTEGER,
  call_count INTEGER DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_key_user ON api_key(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_key(key_hash);

CREATE TABLE IF NOT EXISTS github_login_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  logged_in_at INTEGER NOT NULL,
  created INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user ON github_login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_time ON github_login_audit(logged_in_at DESC);

CREATE TABLE IF NOT EXISTS api_usage_event (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  called_at INTEGER NOT NULL,
  day TEXT NOT NULL,
  hour TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_event_called ON api_usage_event(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_event_key_hour ON api_usage_event(api_key_id, hour);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  type TEXT,
  column_name TEXT,
  home TEXT,
  color TEXT,
  interval INTEGER,
  redirect TEXT,
  url TEXT,
  category TEXT,
  enabled INTEGER DEFAULT 1,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_enabled ON source(enabled);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated INTEGER NOT NULL
);
