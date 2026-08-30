-- ============================================================
-- Adds the poster column to both event tables.
--   wrangler d1 execute anvesha --local --persist-to ../worker/.wrangler/state --file=./migrate-poster.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-poster.sql
--
-- Run once. SQLite has no ADD COLUMN IF NOT EXISTS, so a second run fails with
-- "duplicate column name" — which is loud and harmless, not a corruption.
-- New databases get the column from schema.sql and never need this.
-- ============================================================
ALTER TABLE events_scheduled ADD COLUMN poster_path TEXT;
ALTER TABLE events_done      ADD COLUMN poster_path TEXT;
