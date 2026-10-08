-- ============================================================
-- Anvesha '26 — drop our own mail counter, keep only Resend's word
--   wrangler d1 execute anvesha --local  --file=./migrate-mail-block.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-mail-block.sql
--
-- migrate-mail-quota.sql added `sent` and `refused` so the panel could show "83 of 100
-- used today". The number could not be trusted and so should not have been shown: the
-- key is send-only, there is no API to read Resend's counter, the tally missed every
-- message sent before the ledger existed, and inbound mail draws on the same quota
-- without ever passing through this worker. A figure that is confidently wrong is worse
-- than no figure, because someone plans around it.
--
-- What is left is the only thing that was ever authoritative: Resend answered 429, so
-- stop. One row per UTC day, written when that happens and read before every review.
--
-- The columns go rather than being left unused — a dead column is one someone wires a
-- display back onto in six months.
-- ============================================================

ALTER TABLE mail_quota DROP COLUMN sent;
ALTER TABLE mail_quota DROP COLUMN refused;
