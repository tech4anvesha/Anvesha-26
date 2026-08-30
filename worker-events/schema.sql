-- ============================================================
-- Anvesha '26 events backend — D1 schema
--   wrangler d1 execute anvesha --local  --file=./schema.sql
--   wrangler d1 execute anvesha --remote --file=./schema.sql
--
-- Same D1 database as the merch worker ("anvesha"), different tables. A second
-- database would mean a second thing to back up and migrate for no gain — the two
-- workers share no rows, so the only coupling is the admin session lookup below,
-- which is the point: signing in on the admin panel must also let you edit events.
-- ============================================================

-- ---------- upcoming ----------
CREATE TABLE IF NOT EXISTS events_scheduled (
  event_id      TEXT PRIMARY KEY,               -- EVT_ + 8 random base32 chars
  name          TEXT NOT NULL,
  -- The date and both clock times, as two naive IST stamps: 'YYYY-MM-DD HH:MM'.
  -- Two columns rather than one "timestamp": the sweep below has to compare the END
  -- of an event against now, and the page groups by date — both are one expression
  -- away from these (date(starts_at), time(starts_at)) and neither is derivable from
  -- a single combined string without parsing it.
  --
  -- NO timezone suffix on purpose. Everything about this fest happens in one room in
  -- one timezone; storing UTC would mean every hand-typed row needs converting before
  -- it goes in and after it comes out. The one place that matters is the sweep, which
  -- builds an IST "now" to compare against. See IST_OFFSET_MIN in src/index.ts.
  starts_at     TEXT NOT NULL CHECK (starts_at LIKE '____-__-__ __:__'),
  ends_at       TEXT NOT NULL CHECK (ends_at   LIKE '____-__-__ __:__'),
  venue         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  -- NULL = no registration needed (a talk you just walk into). Empty string is not
  -- the same thing and the Worker normalises it to NULL on the way in.
  registration_link TEXT,
  -- Free text: 'Talk', 'Workshop', 'Competition'. Not a lookup table — a handful of
  -- labels rendered as a chip do not need a join, and the set changes every year.
  event_type    TEXT NOT NULL DEFAULT 'Event',
  -- Key inside the R2 bucket, e.g. 'events/EVT_ABCD1234.jpg'. NULL until a poster is
  -- uploaded. The key, not a URL: the object is served through the Worker so it can be
  -- cached and CORS'd, and a stored URL would have to be rewritten if the host changed.
  poster_path   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  -- Table constraint, so it has to sit after every column. An event that ends before
  -- it starts would never be swept — it would sit at the top of the page forever.
  -- Cheaper to make it impossible than to detect it later.
  CHECK (ends_at > starts_at)
);

-- The sweep runs every 15 minutes and asks exactly one question: what has ended?
CREATE INDEX IF NOT EXISTS idx_events_ends ON events_scheduled (ends_at);

-- ---------- already happened ----------
-- Same columns, minus the registration link (nothing left to register for) and plus
-- the two things that only exist afterwards.
CREATE TABLE IF NOT EXISTS events_done (
  event_id      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  starts_at     TEXT NOT NULL,
  ends_at       TEXT NOT NULL,
  venue         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  -- Drive folder. NULL until someone uploads the photos.
  gallery_link  TEXT,
  -- Written after the fact: what actually happened, how it went.
  summary       TEXT,
  event_type    TEXT NOT NULL DEFAULT 'Event',
  poster_path   TEXT,
  -- When the sweep moved it, not when it was created. Useful for spotting a row that
  -- was moved by hand versus one the cron picked up.
  archived_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The past-events list is newest-first over the whole table.
CREATE INDEX IF NOT EXISTS idx_events_done_ends ON events_done (ends_at DESC);
