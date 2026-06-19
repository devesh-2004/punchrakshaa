-- =============================================================================
-- Migration 003: audit logs, soft delete, default-address constraint,
--                review-aggregate triggers, full text search
--
--   1. audit_logs table (administrative action trail)
--   2. deleted_at soft delete on products / blogs / testimonials / coupons,
--      with business-key UNIQUE constraints converted to partial unique indexes
--      (WHERE deleted_at IS NULL) so a slug/code can be reused after delete
--   3. one-default-address-per-user partial unique index (+ dedupe cleanup)
--   4. products review-aggregate trigger (replaces app-level recalculateRating)
--   5. products full text search: search_vector tsvector + GIN + trigger,
--      backfilled for existing rows
--
-- Transactional and idempotent. Safe on an empty database.
--
-- Apply with: npx tsx scripts/apply-migration.ts 003_audit_softdelete_constraints_fts.sql
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual; run as a single transaction if needed):
--   DROP TRIGGER IF EXISTS products_search_vector ON products;
--   DROP TRIGGER IF EXISTS reviews_aggregate ON reviews;
--   DROP FUNCTION IF EXISTS trg_products_search_vector();
--   DROP FUNCTION IF EXISTS trg_reviews_aggregate();
--   DROP FUNCTION IF EXISTS refresh_product_review_aggregate(UUID);
--   DROP FUNCTION IF EXISTS jsonb_array_to_text(JSONB);
--   DROP INDEX IF EXISTS idx_products_search_vector;
--   ALTER TABLE products DROP COLUMN IF EXISTS search_vector;
--   DROP INDEX IF EXISTS uq_user_addresses_one_default;
--   DROP INDEX IF EXISTS uq_products_slug_active;  CREATE UNIQUE INDEX ... or ADD CONSTRAINT products_slug_key UNIQUE(slug);
--   DROP INDEX IF EXISTS uq_blogs_slug_active;     ALTER TABLE blogs   ADD CONSTRAINT blogs_slug_key   UNIQUE(slug);
--   DROP INDEX IF EXISTS uq_coupons_code_active;   ALTER TABLE coupons ADD CONSTRAINT coupons_code_key UNIQUE(code);
--   -- To drop deleted_at columns, first physically remove soft-deleted rows
--   -- (DELETE ... WHERE deleted_at IS NOT NULL) or they will reappear.
--   DROP TABLE IF EXISTS audit_logs;
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    TEXT NOT NULL DEFAULT '',
  actor_type  TEXT NOT NULL DEFAULT 'admin',
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
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
-- 2. Soft delete columns + partial unique indexes (replace UNIQUE constraints)
-- ---------------------------------------------------------------------------
ALTER TABLE products     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE blogs        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE coupons      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- products.slug : drop full UNIQUE, add partial unique (active rows only)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_key;
DROP INDEX IF EXISTS products_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug_active ON products (slug) WHERE deleted_at IS NULL;

-- blogs.slug
ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_slug_key;
DROP INDEX IF EXISTS blogs_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blogs_slug_active ON blogs (slug) WHERE deleted_at IS NULL;

-- coupons.code
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
DROP INDEX IF EXISTS coupons_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code_active ON coupons (code) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. One default address per user — clean up duplicates, then enforce
-- ---------------------------------------------------------------------------
-- Keep the earliest-created default per user; unset any extra defaults.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
  FROM user_addresses
  WHERE is_default = true
)
UPDATE user_addresses ua
SET is_default = false
FROM ranked
WHERE ua.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_addresses_one_default
  ON user_addresses (user_id) WHERE is_default = true;

-- ---------------------------------------------------------------------------
-- 4. Review aggregate trigger
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
  ELSE
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

-- One-time recompute so existing products are consistent with the new trigger.
UPDATE products p SET
  total_reviews = COALESCE(agg.cnt, 0),
  overall_rating = COALESCE(agg.avg_rating, 0)
FROM (
  SELECT product_id,
         count(*) AS cnt,
         round(avg(rating)::numeric, 1) AS avg_rating
  FROM reviews WHERE status = 'approved'
  GROUP BY product_id
) AS agg
WHERE p.id = agg.product_id;
-- Products with zero approved reviews -> reset to 0.
UPDATE products p SET total_reviews = 0, overall_rating = 0
WHERE NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'
);

-- ---------------------------------------------------------------------------
-- 5. Full text search
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION jsonb_array_to_text(j JSONB) RETURNS TEXT AS $$
  SELECT COALESCE(string_agg(value, ' '), '')
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END
  );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION trg_products_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', jsonb_array_to_text(NEW.content->'benefits')), 'C') ||
    setweight(to_tsvector('english', jsonb_array_to_text(NEW.content->'keywords')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector ON products;
CREATE TRIGGER products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_products_search_vector();

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);

-- Backfill search_vector for existing rows (no-op UPDATE fires the trigger).
UPDATE products SET search_vector = search_vector;

COMMIT;
