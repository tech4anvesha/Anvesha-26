-- ============================================================
-- Ideation meetings — the Expo team's planning sessions.
--   wrangler d1 execute anvesha --local  --file=./migrate-ideation.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-ideation.sql
--
-- Same D1 as everything else. Additive: it creates one table and touches nothing
-- that already exists, so it is safe to run against a live database.
-- ============================================================

CREATE TABLE IF NOT EXISTS ideation_meetings (
  meeting_id  TEXT PRIMARY KEY,               -- IDE_ + 8 random base32 chars
  subject     TEXT NOT NULL,
  -- One naive IST stamp, 'YYYY-MM-DD HH:MM', same convention as events_scheduled.
  -- No end time: a meeting is announced by when it starts, and nobody has ever known
  -- when one of these actually finishes.
  starts_at   TEXT NOT NULL CHECK (starts_at LIKE '____-__-__ __:__'),
  venue       TEXT NOT NULL,

  -- Who put it in. COPIED off the admin's session rather than joined to admin_login,
  -- for the same reason distributions.started_by_* is: the admin password is shared,
  -- so admin_login rows get their session_token cleared on logout and the name has to
  -- stay readable long after that. A join would go blank exactly when it mattered.
  created_by_name  TEXT NOT NULL,
  created_by_roll  TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  -- And who last moved it. NULL until someone other than the clock touches it — an
  -- edit by a second admin would otherwise read as the first admin's doing, which is
  -- the one thing an audit column exists to prevent.
  updated_by_name  TEXT,
  updated_by_roll  TEXT,
  updated_at       TEXT
);

-- The only query that is not by primary key is "what is coming up", soonest first.
CREATE INDEX IF NOT EXISTS idx_ideation_starts ON ideation_meetings (starts_at);
