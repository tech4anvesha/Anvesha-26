-- ============================================================
-- Anvesha '26 — daily mail quota
--   wrangler d1 execute anvesha --local  --file=./migrate-mail-quota.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-mail-quota.sql
--
-- Resend's free tier allows 100 emails per UTC day. On 8 Oct the panel confirmed
-- ~110 orders and nobody could tell which of them actually got their collection QR:
-- sendOrderEmail swallows its own failures by design (a dead mail server must never
-- fail a payment) and nothing recorded the outcome, so the first anyone knew was a
-- student saying they had no pass.
--
-- This is the ledger that makes it visible. One row per UTC day — the same day Resend
-- bills against, NOT the local day, which is why the reset lands at 05:30 IST.
--
-- Deliberately our own count rather than a reading of Resend's: there is no API for
-- their counter on a send-only key. It can drift by a message or two, so a real 429
-- from Resend is treated as authoritative and slams `blocked_at` shut for the day.
-- ============================================================

CREATE TABLE IF NOT EXISTS mail_quota (
  -- 'YYYY-MM-DD' in UTC. date('now') in SQLite is already UTC, so the key is simply
  -- date('now') and no timezone arithmetic is needed anywhere.
  utc_day    TEXT PRIMARY KEY,
  -- Messages we believe were accepted. Incremented only after a 2xx from Resend.
  sent       INTEGER NOT NULL DEFAULT 0,
  -- Messages Resend refused for quota. Kept separate from `sent` so the ledger shows
  -- how far over the day ran rather than silently capping at the limit.
  refused    INTEGER NOT NULL DEFAULT 0,
  -- Set the moment Resend answers 429. Non-null means "stop trying until tomorrow":
  -- every further send that day is skipped before the API call, so the panel can say
  -- why instantly instead of waiting on a round trip to be told no again.
  blocked_at TEXT
);
