-- ============================================================
-- Anvesha '26 — spot sales at the stall
--   wrangler d1 execute anvesha --local  --file=./migrate-spot-sales.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-spot-sales.sql
--
-- The store is shut to the internet: both merch_release switches stay off. A student
-- who walks up to the stall gets in by scanning a QR off the stall's own screen, and
-- that scan is the whole credential. One pass, one order, twenty minutes.
--
-- Why a table and not a signed token: a pass has to be revocable and single-use, and
-- both of those are facts about state, not about a signature. The row IS the state.
--
-- Why the pass is not the order id: the order id is also the collection capability the
-- distribution counter scans, and this one is painted on a screen in a crowd. Keeping
-- them separate means photographing the stall display cannot get anybody's merch.
--
-- Same 128 bits and same alphabet as an order id, for the same reason — the string in
-- the URL is the only thing standing between a closed store and the open internet.
-- ============================================================

CREATE TABLE IF NOT EXISTS spot_pass (
  -- SPT_ + 128 bits of CSPRNG randomness, base32.
  pass_id     TEXT PRIMARY KEY,
  issued_at   TEXT NOT NULL DEFAULT (datetime('now')),
  -- Absolute, written at issue. A pass nobody scanned is also expired early, by setting
  -- this to now — one UPDATE revokes without a second "revoked" column to read.
  expires_at  TEXT NOT NULL,
  -- When the student's phone first opened the link. Set once and never again, so a
  -- forwarded link is dead: the person who scanned it off the screen is the only one it
  -- ever worked for. It is ALSO what frees the stall screen — the volunteer serves the
  -- next student while this one is still paying, rather than waiting out their UPI app.
  claimed_at  TEXT,
  -- When an order was actually submitted under it. A used pass opens nothing.
  used_at     TEXT,
  order_id    TEXT,
  -- Who was at the stall. Copied off the admin's session rather than joined to
  -- admin_login, which can be logged out and its token cleared — same reasoning as
  -- distributions.started_by_roll.
  issued_by_roll TEXT,
  issued_by_name TEXT
);

-- Partial: the only non-primary-key query is "is there a pass still waiting to be
-- scanned", and a full index would be almost entirely dead passes.
CREATE INDEX IF NOT EXISTS idx_spot_pass_live
  ON spot_pass (issued_at) WHERE claimed_at IS NULL AND used_at IS NULL;

-- The marker on the order itself. Not a boolean: the pass id reaches back to who was at
-- the stall and when, so "sold at the stall" and "sold by whom" are one column.
ALTER TABLE orders ADD COLUMN spot_pass TEXT;
