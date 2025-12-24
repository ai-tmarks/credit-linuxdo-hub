CREATE TABLE IF NOT EXISTS lotteries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  join_type TEXT DEFAULT 'free',
  join_price REAL DEFAULT 0,
  draw_type TEXT DEFAULT 'time',
  draw_time INTEGER,
  draw_count INTEGER,
  max_participants INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  min_trust_level INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  participant_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lotteries_short_code ON lotteries(short_code);
CREATE INDEX IF NOT EXISTS idx_lotteries_user_id ON lotteries(user_id);
CREATE INDEX IF NOT EXISTS idx_lotteries_status ON lotteries(status);

CREATE TABLE IF NOT EXISTS lottery_prizes (
  id TEXT PRIMARY KEY,
  lottery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prize_type TEXT DEFAULT 'card',
  content TEXT,
  credit_amount REAL DEFAULT 0,
  winner_count INTEGER DEFAULT 1,
  won_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_lottery_prizes_lottery_id ON lottery_prizes(lottery_id);

CREATE TABLE IF NOT EXISTS lottery_participants (
  id TEXT PRIMARY KEY,
  lottery_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  is_winner INTEGER DEFAULT 0,
  prize_id TEXT,
  prize_content TEXT,
  joined_at INTEGER DEFAULT (unixepoch()),
  won_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_lottery_participants_lottery_id ON lottery_participants(lottery_id);
CREATE INDEX IF NOT EXISTS idx_lottery_participants_user_id ON lottery_participants(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lottery_participants_unique ON lottery_participants(lottery_id, user_id);
