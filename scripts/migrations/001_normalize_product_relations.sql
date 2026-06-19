-- =============================================================================
-- Migration 001: Normalize product relations
--
-- Moves data that previously lived inside products.content (JSONB) and the
-- products.category TEXT column into dedicated relational tables:
--
--   content->'packOptions'          -> product_variants (+ inventory)
--   content->'linkedTestimonialIds' -> product_testimonials (junction)
--   content->'linkedBlogSlugs'      -> product_blogs (junction)
--   products.category (TEXT)        -> categories + products.category_id (FK)
--
-- Safe to run on an empty database (every backfill becomes a no-op) and
-- idempotent enough to re-run: structural steps use IF [NOT] EXISTS, and the
-- content keys are stripped only after their data has been copied out, so a
-- second run simply finds nothing left to copy.
--
-- Apply with:  npx tsx scripts/apply-migration.ts 001_normalize_product_relations.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku ON product_variants (sku) WHERE sku <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_label ON product_variants (product_id, label);

CREATE TABLE IF NOT EXISTS inventory (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id           UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity             INTEGER NOT NULL DEFAULT 0,
  reserved             INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_testimonials (
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  testimonial_id UUID NOT NULL REFERENCES testimonials(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, testimonial_id)
);
CREATE INDEX IF NOT EXISTS idx_product_testimonials_product ON product_testimonials (product_id);

CREATE TABLE IF NOT EXISTS product_blogs (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  blog_id    UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, blog_id)
);
CREATE INDEX IF NOT EXISTS idx_product_blogs_product ON product_blogs (product_id);

-- ---------------------------------------------------------------------------
-- 2. categories backfill + products.category_id FK
--    (guarded so re-running after `category` has been dropped is a no-op)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    -- Seed categories from the distinct non-empty product categories.
    INSERT INTO categories (name, slug)
    SELECT DISTINCT
      btrim(category),
      regexp_replace(regexp_replace(lower(btrim(category)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
    FROM products
    WHERE btrim(category) <> ''
    ON CONFLICT (slug) DO NOTHING;

    -- Add the FK column if it does not already exist.
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

    -- Backfill category_id by matching the original category name.
    UPDATE products p
    SET category_id = c.id
    FROM categories c
    WHERE c.name = btrim(p.category)
      AND p.category_id IS NULL;

    -- Drop the legacy text column now that data has been migrated.
    ALTER TABLE products DROP COLUMN category;
  ELSE
    -- Column already removed by a prior run; just ensure the FK column exists.
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- ---------------------------------------------------------------------------
-- 3. product_variants backfill from content->'packOptions'
-- ---------------------------------------------------------------------------
INSERT INTO product_variants
  (product_id, label, badge, contents, price, mrp, discount_percent, image, position)
SELECT
  p.id,
  COALESCE(po->>'label', ''),
  COALESCE(po->>'badge', ''),
  COALESCE(po->>'contents', ''),
  COALESCE(NULLIF(po->>'price', '')::numeric, 0),
  COALESCE(NULLIF(po->>'mrp', '')::numeric, 0),
  COALESCE(NULLIF(po->>'discountPercent', '')::numeric, 0),
  COALESCE(po->>'image', ''),
  (ord - 1)::int
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.content->'packOptions') = 'array'
       THEN p.content->'packOptions' ELSE '[]'::jsonb END
) WITH ORDINALITY AS t(po, ord)
WHERE COALESCE(po->>'label', '') <> ''
ON CONFLICT (product_id, label) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. inventory: one row per variant (default 0 stock; checkout untouched)
-- ---------------------------------------------------------------------------
INSERT INTO inventory (variant_id, quantity, low_stock_threshold)
SELECT v.id, 0, 0
FROM product_variants v
ON CONFLICT (variant_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. product_testimonials backfill (FK-safe: only existing testimonial ids)
-- ---------------------------------------------------------------------------
INSERT INTO product_testimonials (product_id, testimonial_id, position)
SELECT p.id, t.id, (ord - 1)::int
FROM products p
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(p.content->'linkedTestimonialIds') = 'array'
       THEN p.content->'linkedTestimonialIds' ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(tid, ord)
JOIN testimonials t
  ON e.tid ~ '^[0-9a-fA-F-]{36}$' AND t.id = e.tid::uuid
ON CONFLICT (product_id, testimonial_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. product_blogs backfill (join slugs -> blog ids; skips missing slugs)
-- ---------------------------------------------------------------------------
INSERT INTO product_blogs (product_id, blog_id, position)
SELECT p.id, b.id, (ord - 1)::int
FROM products p
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(p.content->'linkedBlogSlugs') = 'array'
       THEN p.content->'linkedBlogSlugs' ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(slug, ord)
JOIN blogs b ON b.slug = e.slug
ON CONFLICT (product_id, blog_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Strip migrated keys out of content now that they live in their own tables
-- ---------------------------------------------------------------------------
UPDATE products
SET content = content - 'packOptions' - 'linkedTestimonialIds' - 'linkedBlogSlugs'
WHERE content ?| array['packOptions', 'linkedTestimonialIds', 'linkedBlogSlugs'];

COMMIT;
