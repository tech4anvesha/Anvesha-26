-- ============================================================
-- Anvesha '26 — stock counters
--   wrangler d1 execute anvesha --local  --file=./migrate-merch-stock.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-merch-stock.sql
--
-- Spot sales are sold out of a box on a table: there are 9 medium Dragon Warriors and
-- when they are gone they are gone. Until now nothing in the system knew that, so the
-- store would happily take a tenth.
--
-- Per size, not per item, for anything with sizes — "4 shirts left" is not an answer to
-- "have you got a large". An item without sizes keeps ONE row with size = '', rather
-- than a nullable column: NULL is never equal to NULL in SQL, so a nullable size would
-- make the primary key useless for exactly the rows that need it most.
--
-- A MISSING ROW READS AS ZERO, not as unlimited. This is the column that stops money
-- being taken for a thing that does not exist, so its failure mode has to be "refuse"
-- and never "sell". The consequence is deliberate: a newly added item is unsellable
-- until somebody says how many there are.
--
-- The CHECK is the floor under the application's own guard. Every decrement is written
-- `WHERE qty >= ?`, so the UPDATE simply does not fire when the stock is not there;
-- the CHECK is what makes a bug that gets past that an error instead of a negative
-- counter nobody notices.
-- ============================================================

CREATE TABLE IF NOT EXISTS merch_stock (
  merch_id TEXT    NOT NULL,
  -- '' for an item with no sizes. Otherwise exactly the labels the storefront offers.
  size     TEXT    NOT NULL DEFAULT '',
  qty      INTEGER NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (merch_id, size)
);

-- Did this order actually take stock off the shelf?
--
-- Needed because a restore must not invent stock. By the time an order is submitted the
-- student has already paid by UPI, so a submission is never refused over stock — it is
-- recorded, and the decrement either fired or it did not. Rejecting or deleting the
-- order then gives the stock back ONLY if it was taken, and a 0 here is also what tells
-- the panel this order was filed against stock that had already run out.
ALTER TABLE orders ADD COLUMN stock_taken INTEGER NOT NULL DEFAULT 0
  CHECK (stock_taken IN (0, 1));

-- ---------- opening counts, 29 Oct 2026 ----------
-- What is physically on the table, as counted by hand. These are what is left to SELL
-- from now on: the orders already in the database were paid for before any of this
-- existed and are not deducted from them.
--
-- By name rather than by id so the same file runs against local and remote without
-- anybody pasting ids, and INSERT OR REPLACE so a recount is this file edited and
-- re-run. An item not named here has no row, and therefore no stock — see above.
--
-- Only S, M, L and XL are listed. XS, 2XL and 3XL have no rows on purpose: none were
-- printed, so the storefront must show them as unavailable rather than taking an order
-- nobody can fill.

-- One statement per row, rather than one INSERT fed by a UNION ALL of ten terms.
-- D1's SQLite caps compound SELECT terms far lower than the sqlite3 CLI does and
-- answers "too many terms in compound SELECT" — the tidier version ran clean locally
-- under sqlite3 and failed against D1.
--
-- Looked up by name so the same file runs against local and remote with no ids pasted
-- anywhere, and OR REPLACE so a recount is this file edited and run again.

-- Dragon Warrior: S 1 M 9 L 6 XL 5
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'S', 1 FROM merch WHERE name = 'Dragon Warrior';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'M', 9 FROM merch WHERE name = 'Dragon Warrior';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'L', 6 FROM merch WHERE name = 'Dragon Warrior';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'XL', 5 FROM merch WHERE name = 'Dragon Warrior';

-- Reflection of Eden: S 2 M 6 L 3 XL 1
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'S', 2 FROM merch WHERE name = 'Reflection of Eden';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'M', 6 FROM merch WHERE name = 'Reflection of Eden';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'L', 3 FROM merch WHERE name = 'Reflection of Eden';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, 'XL', 1 FROM merch WHERE name = 'Reflection of Eden';

-- The unsized items, one row each under the '' slot.
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 11 FROM merch WHERE name = 'Astraea Gaze';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 13 FROM merch WHERE name = 'Bee-A-Nerd';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 7 FROM merch WHERE name = 'Peer-Buddy';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 12 FROM merch WHERE name = 'Space Wave';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 13 FROM merch WHERE name = 'Fly High';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 7 FROM merch WHERE name = 'Polaroid Mug';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 6 FROM merch WHERE name = 'Dreaming Badge';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 6 FROM merch WHERE name = 'Retro Soda Cap';
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 7 FROM merch WHERE name = 'Solaris Soda Cap';
  -- "the poster": the only item in the Poster category.
INSERT OR REPLACE INTO merch_stock (merch_id, size, qty)
  SELECT id, '', 7 FROM merch WHERE name = 'Himajin Ka yo';

-- The four combos are deliberately absent. A combo is made of items that each have
-- their own count, so giving it an independent number would let one shirt be sold twice
-- — once on its own and once inside a combo. They stay unsellable (a missing row reads
-- as zero) until either a count is given for them or the composition is modelled.
