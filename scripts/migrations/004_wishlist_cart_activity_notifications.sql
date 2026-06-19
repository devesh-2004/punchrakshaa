-- =============================================================================
-- Migration 004: wishlist, server-side cart + abandoned-cart recovery,
--                customer activity logs, notification logs
--
-- Purely additive: six new tables, no changes to existing tables/columns/rows.
-- Safe on an empty database and idempotent (IF NOT EXISTS throughout).
--
-- Apply with: npx tsx scripts/apply-migration.ts 004_wishlist_cart_activity_notifications.sql
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual; children first):
--   DROP TABLE IF EXISTS cart_items, carts,
--                        wishlist_items, wishlists,
--                        customer_activity_logs, notification_logs CASCADE;
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Wishlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wishlist_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items (wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items (product_id);

-- ---------------------------------------------------------------------------
-- 2. Cart (+ abandoned-cart recovery columns) / cart_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token    TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','converted','abandoned')),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_active_per_user
  ON carts (user_id) WHERE status = 'active' AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_status_activity ON carts (status, last_activity_at);

CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  pack_label  TEXT NOT NULL DEFAULT '',
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, pack_label)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items (cart_id);

-- ---------------------------------------------------------------------------
-- 3. Customer activity logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN
                  ('login','product_view','add_to_cart','remove_from_cart',
                   'add_to_wishlist','remove_from_wishlist','checkout_start')),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_activity_user ON customer_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity_logs (activity_type);

-- ---------------------------------------------------------------------------
-- 4. Notification logs (logging only — no provider integration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient   TEXT NOT NULL DEFAULT '',
  channel     TEXT NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  status      TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','sent','failed','delivered')),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs (channel, created_at DESC);

COMMIT;
