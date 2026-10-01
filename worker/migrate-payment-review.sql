-- ============================================================
-- One-time migration: manual payment review.
--
-- There is no payment gateway. A student pays by UPI from their own banking app and
-- then submits EVIDENCE — a transaction reference and a screenshot — which an admin
-- checks against the real statement before the order counts as paid.
--
-- That opens a gap the old design never had: hours, maybe a day, between "the student
-- says they paid" and "we agree they paid". These columns describe that gap.
--
-- Why a separate `review_status` instead of a new `payment_status` value: the CHECK on
-- payment_status allows only ('unpaid','paid','failed'), and SQLite cannot alter a
-- CHECK in place. migrate-collection-status.sql records why `orders` in particular
-- cannot be rebuilt to work around that — payments.order_id has a foreign key to it, so
-- the DROP is refused. `ADD COLUMN ... CHECK` is allowed, which is the whole reason the
-- review lifecycle lives in its own column while payment_status keeps meaning exactly
-- what it meant before: has the money been accepted.
--
-- Note what rejection does NOT do: it leaves payment_status at 'unpaid' rather than
-- setting 'failed'. A rejected order is one the student may fix and resubmit, so it has
-- to stay payable; 'failed' keeps its old meaning of a payment that will never succeed.
--
-- Nullable with no backfill, as every migration here has been. Orders placed before
-- this existed were settled by a gateway and have no review to record — review_status
-- 'none' is the honest answer for them, not 'confirmed'.
--
-- Run once, by hand:
--   wrangler d1 execute anvesha --local  --file=./migrate-payment-review.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-payment-review.sql
-- (or paste the body into --command if --file's import endpoint misbehaves, as it
-- has before on this account — see worker/README.md.)
-- ============================================================

ALTER TABLE orders ADD COLUMN review_status TEXT NOT NULL DEFAULT 'none'
  CHECK (review_status IN ('none', 'pending', 'confirmed', 'rejected'));

-- The reference the student copied out of their UPI app. Free text: every bank formats
-- it differently and a pattern that rejected a real one would be worse than useless.
ALTER TABLE orders ADD COLUMN payment_ref TEXT;

-- R2 key, `orders/<order_id>.<ext>`. The object is private — it shows a UPI handle, a
-- real name and bank-app chrome — and is only ever served behind requireAdmin.
ALTER TABLE orders ADD COLUMN payment_proof_path TEXT;

ALTER TABLE orders ADD COLUMN payment_submitted_at TEXT;

-- Who reviewed it. Copied off the admin's session rather than joined to admin_login:
-- the panel password is shared, so a session row gets logged out and its token cleared,
-- and this still has to name someone afterwards. Same reasoning as merch_release.
ALTER TABLE orders ADD COLUMN reviewed_by_name TEXT;
ALTER TABLE orders ADD COLUMN reviewed_by_roll TEXT;
ALTER TABLE orders ADD COLUMN reviewed_at TEXT;

-- Why it was rejected. Shown to the student on the status page and in the mail, so it
-- is written for them to read, not as an internal note.
ALTER TABLE orders ADD COLUMN review_note TEXT;

-- The admin's queue is "everything pending, newest first", which is this index exactly.
CREATE INDEX IF NOT EXISTS idx_orders_review ON orders (review_status, created_at DESC);
