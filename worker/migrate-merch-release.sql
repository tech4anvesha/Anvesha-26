-- ============================================================
-- One-time migration: merch_release.
--
-- A shop-wide on/off switch, so the storefront can be built and priced in the admin
-- panel days before anyone is allowed to see it. Separate from merch.is_active, which
-- hides ONE item: this hides the whole catalogue and puts a "coming soon" page in its
-- place.
--
-- One row, forced by `CHECK (id = 1)`. Same shape as login_validation: there is no key
-- this could be related to, and a table that can only ever hold one row cannot drift
-- into two disagreeing answers to "is the shop open".
--
-- Seeded to 0 — CLOSED. A migration that opened the shop the moment it ran would be a
-- surprising thing for a switch whose entire job is keeping it shut.
--
-- Run once, by hand:
--   wrangler d1 execute anvesha --local  --file=./migrate-merch-release.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-merch-release.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS merch_release (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  activation_status INTEGER NOT NULL DEFAULT 0 CHECK (activation_status IN (0, 1)),
  -- Who flipped it last, copied off the admin's session rather than joined to
  -- admin_login: the panel password is shared, so a session row gets logged out and its
  -- token cleared, and this still has to name someone afterwards. Same reasoning as
  -- distributions.started_by_roll.
  changed_by_roll   TEXT,
  changed_by_name   TEXT,
  changed_at        TEXT
);

INSERT OR IGNORE INTO merch_release (id, activation_status) VALUES (1, 0);
