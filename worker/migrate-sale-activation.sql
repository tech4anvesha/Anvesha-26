-- ============================================================
-- One-time migration: merch_release.sale_activation (+ attribution).
--
-- A second switch on the same row, independent of the first. activation_status says
-- whether the CATALOGUE is visible; sale_activation says whether MONEY can be taken.
-- They are separate because the two events are separate: the store goes up days
-- before sales open, so students can browse and plan, and the checkout button turns on
-- later without a redeploy.
--
-- Same attribution trio as the first switch, for the same reason: the admin password
-- is shared, so the row has to carry the name itself.
--
-- Seeded to 0 — sales CLOSED. The only safe default for a switch that takes money.
--
-- Run once, by hand:
--   wrangler d1 execute anvesha --local  --file=./migrate-sale-activation.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-sale-activation.sql
-- ============================================================

ALTER TABLE merch_release ADD COLUMN sale_activation INTEGER NOT NULL DEFAULT 0
  CHECK (sale_activation IN (0, 1));
ALTER TABLE merch_release ADD COLUMN sale_activation_changed_by_name TEXT;
ALTER TABLE merch_release ADD COLUMN sale_activation_changed_by_roll TEXT;
ALTER TABLE merch_release ADD COLUMN sale_activation_changed_at TEXT;
