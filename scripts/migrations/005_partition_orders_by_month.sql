-- =============================================================================
-- Migration 005: Partition `orders` by created_at (monthly, native RANGE)
--
-- Converts the existing single `orders` table into a PostgreSQL native
-- range-partitioned table (one partition per calendar month) + a DEFAULT
-- safety partition.
--
-- Because a partitioned table's primary key must include the partition key,
-- the PK becomes (id, created_at). The four child tables that reference
-- orders(id) are migrated to a composite FK (order_id, order_created_at) ->
-- orders(id, created_at). A BEFORE INSERT trigger auto-populates
-- order_created_at from the parent order, so NO repository code changes:
-- callers keep inserting order_id only.
--
-- Repositories, APIs, admin, and frontend behaviour are all preserved:
-- every existing query (SELECT *, WHERE id, WHERE razorpay_order_id,
-- ORDER BY created_at, RETURNING *) works unchanged on the partitioned table.
--
-- Runs in a single transaction (atomic). Safe to run once on the current DB.
--
-- Apply with: npx tsx scripts/apply-migration.ts 005_partition_orders_by_month.sql
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual; or simply restore the pre-migration pg_dump backup):
--   BEGIN;
--   CREATE TABLE orders_flat (LIKE orders INCLUDING ALL);   -- non-partitioned
--   INSERT INTO orders_flat SELECT * FROM orders;
--   -- restore single-column child FKs:
--   ALTER TABLE order_items           DROP CONSTRAINT order_items_order_id_fkey;
--   ALTER TABLE order_status_history  DROP CONSTRAINT order_status_history_order_id_fkey;
--   ALTER TABLE payment_transactions  DROP CONSTRAINT payment_transactions_order_id_fkey;
--   ALTER TABLE coupon_usages         DROP CONSTRAINT coupon_usages_order_id_fkey;
--   DROP TABLE orders CASCADE;                               -- drops partitions
--   ALTER TABLE orders_flat RENAME TO orders;
--   ALTER TABLE orders ADD PRIMARY KEY (id);
--   ALTER TABLE order_items          ADD CONSTRAINT order_items_order_id_fkey          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
--   ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
--   ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
--   ALTER TABLE coupon_usages        ADD CONSTRAINT coupon_usages_order_id_fkey        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
--   ALTER TABLE order_items DROP COLUMN order_created_at; -- (repeat per child)
--   -- recreate trg_order_status_history on orders; restore indexes.
--   COMMIT;
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Helper: create the monthly partition containing a given date (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_orders_partition(p_date date) RETURNS void AS $$
DECLARE
  start_date date := date_trunc('month', p_date)::date;
  end_date   date := (date_trunc('month', p_date) + interval '1 month')::date;
  part_name  text := 'orders_p' || to_char(start_date, 'YYYY_MM');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. Detach child FKs and move the old table aside (free up object names)
-- ---------------------------------------------------------------------------
ALTER TABLE order_items          DROP CONSTRAINT order_items_order_id_fkey;
ALTER TABLE order_status_history DROP CONSTRAINT order_status_history_order_id_fkey;
ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_order_id_fkey;
ALTER TABLE coupon_usages        DROP CONSTRAINT coupon_usages_order_id_fkey;

ALTER TABLE orders RENAME TO orders_old;
ALTER INDEX idx_orders_user        RENAME TO idx_orders_old_user;
ALTER INDEX idx_orders_guest_phone RENAME TO idx_orders_old_guest_phone;
ALTER INDEX idx_orders_status      RENAME TO idx_orders_old_status;
ALTER INDEX idx_orders_razorpay    RENAME TO idx_orders_old_razorpay;
ALTER INDEX idx_orders_created     RENAME TO idx_orders_old_created;
ALTER TABLE orders_old RENAME CONSTRAINT orders_pkey               TO orders_old_pkey;
ALTER TABLE orders_old RENAME CONSTRAINT orders_legacy_object_id_key TO orders_old_legacy_key;
ALTER TABLE orders_old RENAME CONSTRAINT orders_status_check       TO orders_old_status_check;
ALTER TABLE orders_old RENAME CONSTRAINT orders_payment_method_check TO orders_old_pm_check;
ALTER TABLE orders_old RENAME CONSTRAINT orders_user_id_fkey       TO orders_old_user_fk;

-- ---------------------------------------------------------------------------
-- 2. Create the new partitioned orders table (columns identical to original)
--    PK includes the partition key: (id, created_at).
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                     UUID NOT NULL DEFAULT gen_random_uuid(),
  legacy_object_id       TEXT,                       -- unused MongoDB artifact (standalone UNIQUE dropped)
  user_id                UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email            TEXT NOT NULL DEFAULT '',
  guest_phone            TEXT NOT NULL DEFAULT '',
  shipping_address       JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal               NUMERIC NOT NULL DEFAULT 0,
  discount               NUMERIC NOT NULL DEFAULT 0,
  total                  NUMERIC NOT NULL DEFAULT 0,
  coupon_code            TEXT NOT NULL DEFAULT '',
  razorpay_order_id      TEXT NOT NULL DEFAULT '',
  razorpay_payment_id    TEXT NOT NULL DEFAULT '',
  razorpay_signature     TEXT NOT NULL DEFAULT '',
  shiprocket_order_id    TEXT NOT NULL DEFAULT '',
  shiprocket_shipment_id TEXT NOT NULL DEFAULT '',
  awb_code               TEXT NOT NULL DEFAULT '',
  courier_name           TEXT NOT NULL DEFAULT '',
  label_url              TEXT NOT NULL DEFAULT '',
  invoice_url            TEXT NOT NULL DEFAULT '',
  tracking_url           TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  payment_method         TEXT NOT NULL DEFAULT 'Prepaid' CHECK (payment_method IN ('COD','Prepaid')),
  cancel_reason          TEXT NOT NULL DEFAULT '',
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ---------------------------------------------------------------------------
-- 3. Partitions: every month spanned by existing data + buffer, then DEFAULT
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  d date;
  min_d date;
  max_d date;
BEGIN
  SELECT date_trunc('month', min(created_at))::date,
         date_trunc('month', max(now()))::date + interval '3 months'
    INTO min_d, max_d
  FROM orders_old;
  IF min_d IS NULL THEN              -- empty source: still cover current window
    min_d := date_trunc('month', now())::date;
    max_d := min_d + interval '3 months';
  END IF;
  d := min_d;
  WHILE d <= max_d LOOP
    PERFORM ensure_orders_partition(d);
    d := (d + interval '1 month')::date;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS orders_default PARTITION OF orders DEFAULT;

-- ---------------------------------------------------------------------------
-- 4. Indexes (declared on the partitioned parent -> apply to all partitions)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_orders_user        ON orders (user_id);
CREATE INDEX idx_orders_guest_phone ON orders (guest_phone);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_orders_razorpay    ON orders (razorpay_order_id);
CREATE INDEX idx_orders_created     ON orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Copy data (routes to monthly partitions by created_at).
--    The status-history trigger is intentionally NOT yet attached, so the
--    bulk copy does not generate spurious order_status_history rows.
-- ---------------------------------------------------------------------------
INSERT INTO orders (
  id, legacy_object_id, user_id, guest_email, guest_phone, shipping_address,
  subtotal, discount, total, coupon_code, razorpay_order_id, razorpay_payment_id,
  razorpay_signature, shiprocket_order_id, shiprocket_shipment_id, awb_code,
  courier_name, label_url, invoice_url, tracking_url, status, payment_method,
  cancel_reason, cancelled_at, created_at, updated_at
)
SELECT
  id, legacy_object_id, user_id, guest_email, guest_phone, shipping_address,
  subtotal, discount, total, coupon_code, razorpay_order_id, razorpay_payment_id,
  razorpay_signature, shiprocket_order_id, shiprocket_shipment_id, awb_code,
  courier_name, label_url, invoice_url, tracking_url, status, payment_method,
  cancel_reason, cancelled_at, created_at, updated_at
FROM orders_old;

-- ---------------------------------------------------------------------------
-- 6. Re-attach the Phase-2 order status-history trigger to the new orders.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_order_status_history ON orders;
CREATE TRIGGER trg_order_status_history
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ---------------------------------------------------------------------------
-- 7. Child tables: add order_created_at, backfill, auto-populate trigger,
--    and composite FK -> orders(id, created_at). Repositories stay unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION orders_child_set_created_at() RETURNS trigger AS $$
BEGIN
  IF NEW.order_id IS NOT NULL AND NEW.order_created_at IS NULL THEN
    SELECT created_at INTO NEW.order_created_at FROM orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- order_items (ON DELETE CASCADE)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_created_at TIMESTAMPTZ;
UPDATE order_items c SET order_created_at = o.created_at FROM orders o WHERE o.id = c.order_id;
DROP TRIGGER IF EXISTS trg_set_order_created_at ON order_items;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE CASCADE;

-- order_status_history (ON DELETE CASCADE)
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS order_created_at TIMESTAMPTZ;
UPDATE order_status_history c SET order_created_at = o.created_at FROM orders o WHERE o.id = c.order_id;
DROP TRIGGER IF EXISTS trg_set_order_created_at ON order_status_history;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON order_status_history
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();
ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_order_id_fkey
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE CASCADE;

-- payment_transactions (ON DELETE SET NULL)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS order_created_at TIMESTAMPTZ;
UPDATE payment_transactions c SET order_created_at = o.created_at FROM orders o WHERE o.id = c.order_id;
DROP TRIGGER IF EXISTS trg_set_order_created_at ON payment_transactions;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_order_id_fkey
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE SET NULL;

-- coupon_usages (ON DELETE SET NULL)
ALTER TABLE coupon_usages ADD COLUMN IF NOT EXISTS order_created_at TIMESTAMPTZ;
UPDATE coupon_usages c SET order_created_at = o.created_at FROM orders o WHERE o.id = c.order_id;
DROP TRIGGER IF EXISTS trg_set_order_created_at ON coupon_usages;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON coupon_usages
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();
ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_order_id_fkey
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 8. Drop the old table (frees the original object names).
-- ---------------------------------------------------------------------------
DROP TABLE orders_old;

COMMIT;
