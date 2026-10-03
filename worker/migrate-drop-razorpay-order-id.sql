-- ============================================================
-- Anvesha '26 — drop orders.razorpay_order_id
--   wrangler d1 execute anvesha --local  --file=./migrate-drop-razorpay-order-id.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-drop-razorpay-order-id.sql
--
-- There is no gateway and there is not going to be one this fest, so nothing has
-- written this column since payment went manual — every row holds NULL. The two
-- handlers that read it, razorpayWebhook and verifyPayment, are deleted in the same
-- change; both looked an order up BY this column, so neither can survive without it.
--
-- DEPLOY THE WORKER FIRST, THEN RUN THIS. The usual order is the other way round —
-- a worker wanting columns a database has not got 500s on every call, which is what
-- happened on 29 Sep. A *dropped* column inverts it: the old worker's INSERT still
-- names razorpay_order_id, so running this first breaks every submission until the
-- deploy lands. New code against the old schema is harmless by comparison — the
-- column simply sits there unused.
--
-- What stays, deliberately:
--   src/razorpay.ts            signature + API helpers, no column reference, reusable
--   payments.razorpay_*        a different table, and adminReviewOrder writes it today
--   webhook_events             empty now, but it is the audit trail of what ever
--                              arrived; dropping a log is not a schema saving
--
-- Putting a gateway back means re-adding the column (ALTER TABLE orders ADD COLUMN
-- razorpay_order_id TEXT) plus its index, then rebuilding the two handlers on the
-- helpers above.
-- ============================================================

-- The index first. SQLite refuses to drop an indexed column and fails with
-- "error in index idx_orders_razorpay after drop column: no such column",
-- which is confusing enough to be worth writing down rather than rediscovering.
DROP INDEX IF EXISTS idx_orders_razorpay;

-- Allowed even though `orders` cannot be REBUILT — payments.order_id references it, so
-- the usual create-copy-swap is blocked. A column drop is not a rebuild and needs no
-- new table, which is the only reason this is a one-liner.
ALTER TABLE orders DROP COLUMN razorpay_order_id;
