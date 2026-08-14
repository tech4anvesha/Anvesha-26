-- ============================================================
-- Anvesha '26 merch backend — D1 schema
--   wrangler d1 execute anvesha --local --file=./schema.sql
-- ============================================================

-- ---------- catalogue ----------
CREATE TABLE IF NOT EXISTS merch (
  id            TEXT PRIMARY KEY,               -- MER_ + 8 random base32 chars, see newMerchId()
  name          TEXT    NOT NULL,
  description   TEXT    NOT NULL,
  designer      TEXT    NOT NULL,
  -- The storefront groups items into a tree, so the grouping has to live in the data.
  -- Free text rather than a lookup table: three categories do not need a join.
  category      TEXT    NOT NULL DEFAULT 'General',
  r2_path       TEXT    NOT NULL,               -- key inside the R2 bucket
  -- Money is stored in PAISE as an integer, never rupees as a float.
  -- 499.00 in a REAL column cannot be represented exactly and totals drift.
  -- Razorpay's API also takes paise, so this avoids a conversion at the boundary.
  price_paise   INTEGER NOT NULL CHECK (price_paise > 0),
  has_size      INTEGER NOT NULL DEFAULT 0 CHECK (has_size IN (0, 1)),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- extra product views ----------
-- merch.r2_path holds the primary image; anything beyond it lives here, which is what
-- lets the storefront's view carousel show Front/Back/Detail instead of one picture.
-- Kept as rows rather than a JSON column so an image can be added or reordered without
-- rewriting the merch row.
CREATE TABLE IF NOT EXISTS merch_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  merch_id   TEXT    NOT NULL REFERENCES merch (id),
  r2_path    TEXT    NOT NULL,
  label      TEXT    NOT NULL DEFAULT 'View',
  -- Display order. The primary image is always index 0; these follow.
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_merch_images ON merch_images (merch_id, sort);

-- ---------- orders ----------
CREATE TABLE IF NOT EXISTS orders (
  -- ORD_ + 128 bits of randomness. The id IS the collection capability: whoever
  -- holds the QR can collect, exactly like a paper ticket. That only holds if the
  -- id is unguessable, so it must never be sequential.
  order_id           TEXT PRIMARY KEY,
  -- Snapshot of the cart at purchase time: name and unit price are copied in, not
  -- referenced. A later price change must not rewrite what someone already paid.
  order_info         TEXT    NOT NULL,          -- JSON: [{merch_id,name,quantity,size,unit_price_paise,line_total_paise}]
  total_price_paise  INTEGER NOT NULL CHECK (total_price_paise > 0),
  payment_status     TEXT    NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid', 'paid', 'failed')),
  collection_status  INTEGER NOT NULL DEFAULT 0 CHECK (collection_status IN (0, 1)),
  razorpay_order_id  TEXT,                      -- order_xxx, from Razorpay
  collected_at       TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT
);

-- the webhook arrives knowing only Razorpay's order id, so this lookup must be indexed
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (payment_status, collection_status);

-- ---------- payments ----------
CREATE TABLE IF NOT EXISTS payments (
  payment_id              TEXT PRIMARY KEY,     -- PAY_ + 128 bits
  order_id                TEXT NOT NULL REFERENCES orders (order_id),
  -- UNIQUE is the idempotency guard. Razorpay retries webhooks on any non-2xx and
  -- can deliver the same event twice; this makes a duplicate insert fail loudly
  -- instead of silently double-recording a payment.
  -- NULL for failed payments — SQLite permits many NULLs in a UNIQUE column.
  razorpay_transaction_id TEXT UNIQUE,
  transaction_info        TEXT NOT NULL,        -- JSON: the Razorpay payment entity
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);

-- ---------- webhook audit ----------
-- Every verified webhook lands here before anything is mutated. When a payment is
-- disputed months later, this is the only record of what Razorpay actually sent.
CREATE TABLE IF NOT EXISTS webhook_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
