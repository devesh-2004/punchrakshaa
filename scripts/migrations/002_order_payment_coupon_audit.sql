-- =============================================================================
-- Migration 002: order / payment / coupon audit trail
--
-- Adds three audit tables and a trigger that records every order status
-- transition automatically:
--
--   order_status_history  <- AFTER INSERT/UPDATE trigger on orders
--   payment_transactions  <- written by the Razorpay create-order/verify flow
--   coupon_usages         <- written by create-order when a coupon is applied
--
-- Existing orders are backfilled with a single status-history row reflecting
-- their current status. Payment/coupon ledgers are forward-only (there is no
-- historical Razorpay payload to reconstruct), so they start empty.
--
-- Safe on an empty database and idempotent: structural objects use
-- IF [NOT] EXISTS / CREATE OR REPLACE, and the backfill skips orders that
-- already have history.
--
-- Apply with:  npx tsx scripts/apply-migration.ts 002_order_payment_coupon_audit.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. order_status_history + automatic trigger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  changed_by  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, created_at);

CREATE OR REPLACE FUNCTION log_order_status_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, COALESCE(current_setting('app.actor', true), ''));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(current_setting('app.actor', true), ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_history ON orders;
CREATE TRIGGER trg_order_status_history
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Backfill: seed one history row per existing order (current status), only for
-- orders that have no history yet. Uses the order's own created_at timestamp.
INSERT INTO order_status_history (order_id, from_status, to_status, note, created_at)
SELECT o.id, NULL, o.status, 'backfilled', o.created_at
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_status_history h WHERE h.order_id = o.id
);

-- ---------------------------------------------------------------------------
-- 2. payment_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_order_id   TEXT NOT NULL DEFAULT '',
  razorpay_payment_id TEXT NOT NULL DEFAULT '',
  razorpay_signature  TEXT NOT NULL DEFAULT '',
  amount              NUMERIC NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','authorized','captured','failed','refunded')),
  method              TEXT NOT NULL DEFAULT '',
  error_reason        TEXT NOT NULL DEFAULT '',
  notes               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_rzp_order ON payment_transactions (razorpay_order_id);

-- ---------------------------------------------------------------------------
-- 3. coupon_usages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupon_usages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_phone     TEXT NOT NULL DEFAULT '',
  code            TEXT NOT NULL DEFAULT '',
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order ON coupon_usages (order_id);

COMMIT;
