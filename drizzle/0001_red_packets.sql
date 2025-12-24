CREATE TABLE IF NOT EXISTS red_packets (
  id TEXT PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  total_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  total_count INTEGER NOT NULL,
  remaining_count INTEGER NOT NULL,
  type TEXT DEFAULT 'random',
  message TEXT,
  status TEXT DEFAULT 'pending',
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_red_packets_short_code ON red_packets(short_code);

CREATE TABLE IF NOT EXISTS red_packet_claims (
  id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  error_msg TEXT,
  sent_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(packet_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_red_packet_claims_packet_id ON red_packet_claims(packet_id);
