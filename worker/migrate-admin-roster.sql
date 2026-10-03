-- ============================================================
-- Anvesha '26 — who is allowed into the admin panel
--   wrangler d1 execute anvesha --local  --file=./migrate-admin-roster.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-admin-roster.sql
--
-- Until now the shared password was the whole gate: anyone holding it typed any name
-- and any roll number and was in. On 3 Oct an order was confirmed by `PP / IDK42069`,
-- a roll that does not exist, and the only way to find out who that actually was ran
-- through admin_login.collegemail. The roll number becomes a second factor here: it
-- has to be on this list before the password is even worth checking.
--
-- A SEPARATE TABLE, not a column on login_validation. That table is pinned to one row
-- by CHECK (id = 1) so that there can never be two passwords disagreeing about who
-- gets in — a set of rolls cannot live in it without becoming a delimited string, and
-- then "is IMS24038 allowed" turns into a LIKE over that string, which matches
-- IMS240380 too. One row per person keeps it a real lookup.
--
-- RUN THIS AND SEED IT BEFORE DEPLOYING THE WORKER. An empty roster locks everybody
-- out, including whoever is mid-way through confirming orders.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_roster (
  -- Uppercase, exactly as normaliseRoll produces. The PK does the enforcing: adding a
  -- roll twice is a no-op rather than two rows that could later disagree.
  roll_number TEXT PRIMARY KEY,
  -- Whose roll this is, for the humans maintaining the list. NOT used for attribution:
  -- admin_login still records the name the person typed. Changing that is a separate
  -- decision about what the audit trail means.
  person      TEXT,
  -- Soft removal. A volunteer who leaves gets 0 rather than a DELETE, so the row still
  -- explains an old entry in admin_login that would otherwise name nobody.
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  -- Attribution, same convention as merch_release: copied in, not joined, so it stays
  -- readable after the adding admin's session is long gone.
  added_by    TEXT,
  added_at    TEXT NOT NULL DEFAULT (datetime('now')),
  note        TEXT
);

-- requireAdmin reads this on EVERY authenticated request, not just at login — the same
-- rule login_validation.active follows. Dropping someone from the roster has to end the
-- session they already have open, or removal would mean "no new logins" and nothing more.
-- The PK index already covers the lookup, so there is no second index to create.

-- ---------- seeding ----------
-- Add people with:
--   INSERT OR REPLACE INTO admin_roster (roll_number, person, added_by)
--     VALUES ('IMS24038', 'Antrin Maji', 'bootstrap');
-- Suspend without forgetting who they were:
--   UPDATE admin_roster SET active = 0 WHERE roll_number = 'IMS23196';
-- Read the current list:
--   SELECT roll_number, person, active FROM admin_roster ORDER BY roll_number;
