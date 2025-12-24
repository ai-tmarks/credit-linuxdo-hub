CREATE TABLE IF NOT EXISTS tip_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  preset_amounts TEXT DEFAULT '[5,10,20,50]',
  min_amount REAL DEFAULT 1,
  max_amount REAL DEFAULT 1000,
  allow_custom INTEGER DEFAULT 1,
  total_received REAL DEFAULT 0,
  tip_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tip_links_user_id ON tip_links(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_links_short_code ON tip_links(short_code);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  epay_pid TEXT,
  epay_key TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
