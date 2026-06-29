-- PunchRaksha PostgreSQL schema
-- Hybrid-normalized: relational core + JSONB only for product presentational content
-- and point-in-time snapshots. UUID primary keys, foreign keys, CHECK constraints.
-- Apply with:  npx tsx scripts/apply-schema.ts   (uses DATABASE_URL)

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- categories  (normalized product categories; products.category_id FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  name             TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL UNIQUE,
  role             TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  otp_hash         TEXT NOT NULL DEFAULT '',
  otp_expires_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ---------------------------------------------------------------------------
-- user_addresses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT '',
  full_name      TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  address_line1  TEXT NOT NULL DEFAULT '',
  address_line2  TEXT NOT NULL DEFAULT '',
  city           TEXT NOT NULL DEFAULT '',
  state          TEXT NOT NULL DEFAULT '',
  pincode        TEXT NOT NULL DEFAULT '',
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses (user_id);

-- ---------------------------------------------------------------------------
-- products  (presentational content lives in `content` JSONB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id   TEXT UNIQUE,
  slug               TEXT NOT NULL,   -- uniqueness enforced by partial index (active rows only)
  name               TEXT NOT NULL,
  secondary_name     TEXT NOT NULL DEFAULT '',
  label              TEXT,
  sub_label          TEXT,
  short_description  TEXT NOT NULL DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  price              NUMERIC NOT NULL DEFAULT 0,
  discounted_price   NUMERIC NOT NULL DEFAULT 0,
  discount_percent   NUMERIC NOT NULL DEFAULT 0,
  category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_type       TEXT NOT NULL DEFAULT 'single-powder',
  pack_unit          TEXT NOT NULL DEFAULT 'grams',
  in_stock           BOOLEAN NOT NULL DEFAULT true,
  is_archived        BOOLEAN NOT NULL DEFAULT false,
  is_best_selling    BOOLEAN NOT NULL DEFAULT false,
  is_upsell_product  BOOLEAN NOT NULL DEFAULT false,
  cod_available      BOOLEAN NOT NULL DEFAULT true,
  overall_rating     NUMERIC NOT NULL DEFAULT 0,   -- maintained by reviews trigger
  total_reviews      INTEGER NOT NULL DEFAULT 0,    -- maintained by reviews trigger
  content            JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_vector      TSVECTOR,                      -- maintained by FTS trigger
  deleted_at         TIMESTAMPTZ,                   -- soft delete (NULL = active)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug_active ON products (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_best_selling ON products (is_best_selling);
CREATE INDEX IF NOT EXISTS idx_products_upsell ON products (is_upsell_product);
CREATE INDEX IF NOT EXISTS idx_products_stock_archived ON products (in_stock, is_archived);

-- ---------------------------------------------------------------------------
-- product_variants  (replaces the `content->packOptions` JSONB array)
-- Each variant is a buyable pack with its own price/badge/image + SKU.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label            TEXT NOT NULL DEFAULT '',
  badge            TEXT NOT NULL DEFAULT '',
  contents         TEXT NOT NULL DEFAULT '',
  price            NUMERIC NOT NULL DEFAULT 0,
  mrp              NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  image            TEXT NOT NULL DEFAULT '',
  sku              TEXT NOT NULL DEFAULT '',
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);
-- Unique SKU across the catalogue (blank SKUs are allowed and not constrained).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku ON product_variants (sku) WHERE sku <> '';
-- A pack label is unique within a product (used as the stable sync/cart key).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_label ON product_variants (product_id, label);

-- ---------------------------------------------------------------------------
-- inventory  (stock tracking per variant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id           UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity             INTEGER NOT NULL DEFAULT 0,
  reserved             INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- product_testimonials / product_blogs junction tables are defined at the
-- bottom of this file (they reference testimonials/blogs created further down).

-- ---------------------------------------------------------------------------
-- orders  (RANGE-partitioned by created_at, monthly — see migration 005)
-- The PK must include the partition key, hence (id, created_at). Child tables
-- reference orders(id, created_at) via a composite FK whose order_created_at
-- column is auto-populated by the orders_child_set_created_at() trigger, so
-- repositories keep inserting order_id only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                     UUID NOT NULL DEFAULT gen_random_uuid(),
  legacy_object_id       TEXT,                       -- unused MongoDB artifact (no standalone UNIQUE on a partitioned table)
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
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_phone ON orders (guest_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

-- Create the monthly partition containing a given date (idempotent).
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

-- Seed the current month + the next 3 months, then a DEFAULT safety partition.
-- Future months are kept ahead by scripts/ensure-order-partitions.ts (cron).
DO $$
DECLARE i int;
BEGIN
  FOR i IN 0..3 LOOP
    PERFORM ensure_orders_partition((date_trunc('month', now()) + (i || ' months')::interval)::date);
  END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS orders_default PARTITION OF orders DEFAULT;

-- Auto-populate a child's order_created_at from its parent order so the
-- composite FK (order_id, order_created_at) -> orders(id, created_at) holds
-- without any change to repository insert statements.
CREATE OR REPLACE FUNCTION orders_child_set_created_at() RETURNS trigger AS $$
BEGIN
  IF NEW.order_id IS NOT NULL AND NEW.order_created_at IS NULL THEN
    SELECT created_at INTO NEW.order_created_at FROM orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL,
  order_created_at TIMESTAMPTZ,   -- auto-filled by trigger; part of composite FK
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  name             TEXT NOT NULL DEFAULT '',
  image            TEXT NOT NULL DEFAULT '',
  pack_label       TEXT NOT NULL DEFAULT '',
  price            NUMERIC NOT NULL DEFAULT 0,
  qty              INTEGER NOT NULL DEFAULT 1,
  position         INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
DROP TRIGGER IF EXISTS trg_set_order_created_at ON order_items;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_name       TEXT NOT NULL DEFAULT '',
  guest_phone      TEXT NOT NULL DEFAULT '',
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title            TEXT NOT NULL DEFAULT '',
  body             TEXT NOT NULL,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  added_by_admin   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);

-- ---------------------------------------------------------------------------
-- blogs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blogs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  slug             TEXT NOT NULL,   -- uniqueness enforced by partial index (active rows only)
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL DEFAULT '',
  content          TEXT NOT NULL DEFAULT '',
  cover_image      TEXT NOT NULL DEFAULT '',
  cover_image_alt  TEXT NOT NULL DEFAULT '',
  author           TEXT NOT NULL DEFAULT '',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  meta_title       TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  published_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,     -- soft delete (NULL = active)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blogs_slug_active ON blogs (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs (published_at DESC);

-- ---------------------------------------------------------------------------
-- content_pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT '',
  meta_title       TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  is_published     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- coupons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  code             TEXT NOT NULL,   -- uniqueness enforced by partial index (active rows only)
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value   NUMERIC NOT NULL DEFAULT 0,
  min_order_value  NUMERIC NOT NULL DEFAULT 0,
  max_uses         INTEGER NOT NULL DEFAULT 0,
  used_count       INTEGER NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  deleted_at       TIMESTAMPTZ,     -- soft delete (NULL = active)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code_active ON coupons (code) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_object_id TEXT UNIQUE,
  image            TEXT NOT NULL DEFAULT '',
  video_id         TEXT NOT NULL DEFAULT '',
  customer_name    TEXT NOT NULL DEFAULT '',
  order_idx        INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  deleted_at       TIMESTAMPTZ,     -- soft delete (NULL = active)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials (order_idx);

-- ---------------------------------------------------------------------------
-- site_settings  (single 'global' row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key           TEXT PRIMARY KEY DEFAULT 'global',
  consultation  JSONB NOT NULL DEFAULT '{}'::jsonb,
  badges        JSONB NOT NULL DEFAULT '{}'::jsonb,
  support_whatsapp TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- product_testimonials  (junction; replaces content->linkedTestimonialIds)
-- Defined here because it references testimonials (created above).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_testimonials (
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  testimonial_id UUID NOT NULL REFERENCES testimonials(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, testimonial_id)
);
CREATE INDEX IF NOT EXISTS idx_product_testimonials_product ON product_testimonials (product_id);

-- ---------------------------------------------------------------------------
-- product_blogs  (junction; replaces content->linkedBlogSlugs)
-- Defined here because it references blogs (created above).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_blogs (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  blog_id    UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, blog_id)
);
CREATE INDEX IF NOT EXISTS idx_product_blogs_product ON product_blogs (product_id);

-- ===========================================================================
-- Phase 2: order / payment / coupon audit trail
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- order_status_history  (one row per status transition; populated by trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL,
  order_created_at TIMESTAMPTZ,                 -- auto-filled by trigger; part of composite FK
  from_status      TEXT,                        -- NULL on the initial insert
  to_status        TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  changed_by       TEXT NOT NULL DEFAULT '',    -- optional actor via SET app.actor
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, created_at);
DROP TRIGGER IF EXISTS trg_set_order_created_at ON order_status_history;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON order_status_history
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();

-- Trigger function: log every status change automatically, regardless of which
-- code path performed the update. changed_by is read from the optional
-- `app.actor` GUC (NULL-safe) so callers MAY attribute a transition.
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

-- ---------------------------------------------------------------------------
-- payment_transactions  (append-only ledger for the Razorpay workflow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID,
  order_created_at    TIMESTAMPTZ,                       -- auto-filled by trigger; part of composite FK
  provider            TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_order_id   TEXT NOT NULL DEFAULT '',
  razorpay_payment_id TEXT NOT NULL DEFAULT '',
  razorpay_signature  TEXT NOT NULL DEFAULT '',
  amount              NUMERIC NOT NULL DEFAULT 0,        -- INR (rupees)
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','authorized','captured','failed','refunded')),
  method              TEXT NOT NULL DEFAULT '',          -- COD | Prepaid
  error_reason        TEXT NOT NULL DEFAULT '',
  notes               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_rzp_order ON payment_transactions (razorpay_order_id);
DROP TRIGGER IF EXISTS trg_set_order_created_at ON payment_transactions;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();

-- ---------------------------------------------------------------------------
-- coupon_usages  (redemption history; one row per coupon applied to an order)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupon_usages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id        UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id         UUID,
  order_created_at TIMESTAMPTZ,                      -- auto-filled by trigger; part of composite FK
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_phone      TEXT NOT NULL DEFAULT '',
  code             TEXT NOT NULL DEFAULT '',
  discount_amount  NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id),
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order ON coupon_usages (order_id);
DROP TRIGGER IF EXISTS trg_set_order_created_at ON coupon_usages;
CREATE TRIGGER trg_set_order_created_at BEFORE INSERT ON coupon_usages
  FOR EACH ROW EXECUTE FUNCTION orders_child_set_created_at();

-- ===========================================================================
-- Phase 3: audit log, default-address constraint, review aggregates, FTS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- audit_logs  (administrative action trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    TEXT NOT NULL DEFAULT '',           -- admin uuid or email (env admin has no uuid)
  actor_type  TEXT NOT NULL DEFAULT 'admin',
  action      TEXT NOT NULL,                       -- e.g. product.update, order.status_change
  entity_type TEXT NOT NULL DEFAULT '',            -- e.g. product, order, blog
  entity_id   TEXT NOT NULL DEFAULT '',
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- One default address per user (partial unique index)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_addresses_one_default
  ON user_addresses (user_id) WHERE is_default = true;

-- ---------------------------------------------------------------------------
-- Review aggregate maintenance: keep products.total_reviews / overall_rating
-- in sync from approved reviews. Replaces app-level recalculateRating().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_product_review_aggregate(pid UUID) RETURNS void AS $$
BEGIN
  IF pid IS NULL THEN RETURN; END IF;
  UPDATE products p SET
    total_reviews = COALESCE(agg.cnt, 0),
    overall_rating = COALESCE(agg.avg_rating, 0)
  FROM (
    SELECT count(*) AS cnt,
           round(avg(rating)::numeric, 1) AS avg_rating
    FROM reviews
    WHERE product_id = pid AND status = 'approved'
  ) AS agg
  WHERE p.id = pid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_reviews_aggregate() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_product_review_aggregate(NEW.product_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_product_review_aggregate(OLD.product_id);
  ELSE  -- UPDATE
    PERFORM refresh_product_review_aggregate(NEW.product_id);
    IF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      PERFORM refresh_product_review_aggregate(OLD.product_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_aggregate ON reviews;
CREATE TRIGGER reviews_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_reviews_aggregate();

-- ---------------------------------------------------------------------------
-- Full Text Search on products: name (A), short_description (B),
-- content->benefits (C), content->keywords (C).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION jsonb_array_to_text(j JSONB) RETURNS TEXT AS $$
  SELECT COALESCE(string_agg(value, ' '), '')
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END
  );
$$ LANGUAGE sql IMMUTABLE;

-- Benefits term is sourced from the product_benefits table (see Phase 6);
-- keywords still live in content. plpgsql resolves the table reference at
-- runtime, so the table being created further down this file is fine.
CREATE OR REPLACE FUNCTION trg_products_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(
      (SELECT string_agg(b.text, ' ') FROM product_benefits b WHERE b.product_id = NEW.id), ''
    )), 'C') ||
    setweight(to_tsvector('english', jsonb_array_to_text(NEW.content->'keywords')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector ON products;
CREATE TRIGGER products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_products_search_vector();

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);

-- ===========================================================================
-- Phase 4: wishlist, server-side cart (+ abandoned-cart recovery),
--          customer activity logs, notification logs
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- wishlists / wishlist_items  (one wishlist per user)
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
-- carts / cart_items  (server-side cart; one active cart per user)
-- last_activity_at + abandoned_at power abandoned-cart recovery.
-- user_id nullable + session_token reserved for future guest-cart migration.
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
-- One active cart per user.
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
-- customer_activity_logs  (lightweight behavioural events)
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
-- notification_logs  (SMS / Email / WhatsApp — logging only)
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

-- ===========================================================================
-- Phase 6: normalize product presentational arrays out of content JSONB.
-- These replace content->{images,faqs,ingredients,tags,benefits}. The product
-- repository hydrates them back onto the product doc with the original shapes.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,          -- URL only (R2 / external); no base64
  alt_text    TEXT NOT NULL DEFAULT '',
  filename    TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);

CREATE TABLE IF NOT EXISTS product_faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question    TEXT NOT NULL DEFAULT '',
  answer      TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_faqs_product ON product_faqs (product_id);

CREATE TABLE IF NOT EXISTS product_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',   -- URL only (R2 / external); no base64
  description TEXT NOT NULL DEFAULT '',
  alt_text    TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients (product_id);

CREATE TABLE IF NOT EXISTS product_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags (product_id);

CREATE TABLE IF NOT EXISTS product_benefits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  text        TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_benefits_product ON product_benefits (product_id);

-- Recompute a product's search_vector when its benefits change (fires the
-- products BEFORE trigger via a no-op touch; no recursion).
CREATE OR REPLACE FUNCTION trg_product_benefits_refresh_search() RETURNS trigger AS $$
DECLARE pid UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products SET updated_at = now() WHERE id = pid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_benefits_refresh_search ON product_benefits;
CREATE TRIGGER product_benefits_refresh_search
  AFTER INSERT OR UPDATE OR DELETE ON product_benefits
  FOR EACH ROW EXECUTE FUNCTION trg_product_benefits_refresh_search();

-- ---------------------------------------------------------------------------
-- Covering indexes on foreign-key columns (migration 007) — back cascade
-- deletes and joins that previously had no index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cart_items_product               ON cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant               ON cart_items (variant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user               ON coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product              ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_product_blogs_blog               ON product_blogs (blog_id);
CREATE INDEX IF NOT EXISTS idx_product_testimonials_testimonial ON product_testimonials (testimonial_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user                     ON reviews (user_id);

-- Migration: Add label and sub_label to products table if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_label TEXT;

-- Migration: Add support_whatsapp to site_settings table if it doesn't exist
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS support_whatsapp TEXT NOT NULL DEFAULT '';
