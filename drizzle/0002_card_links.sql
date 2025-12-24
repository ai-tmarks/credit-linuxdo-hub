CREATE TABLE IF NOT EXISTS card_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  total_stock INTEGER NOT NULL,
  sold_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 0,
  min_trust_level INTEGER DEFAULT 0,
  card_mode TEXT DEFAULT 'one_to_one',
  cards_per_order INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_links_short_code ON card_links(short_code);
CREATE INDEX IF NOT EXISTS idx_card_links_user_id ON card_links(user_id);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  buyer_id TEXT,
  buyer_username TEXT,
  order_no TEXT,
  sold_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_cards_link_id ON cards(link_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_order_no ON cards(order_no);

CREATE TABLE IF NOT EXISTS card_orders (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  card_id TEXT,
  buyer_id TEXT NOT NULL,
  buyer_username TEXT NOT NULL,
  amount REAL NOT NULL,
  trade_no TEXT,
  out_trade_no TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  paid_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_card_orders_link_id ON card_orders(link_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_buyer_id ON card_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_out_trade_no ON card_orders(out_trade_no);
