-- =============================================================================
-- Migration 006: normalize product presentational arrays out of content JSONB
--
--   1. product_images       (was content->'images')
--   2. product_faqs         (was content->'faqs')
--   3. product_ingredients  (was content->'ingredients')
--   4. product_tags         (was content->'tags')
--   5. product_benefits     (was content->'benefits')
--   6. Full Text Search: rewire the weight-C benefits term to read from the new
--      product_benefits table; add an AFTER trigger on product_benefits that
--      recomputes the owning product's search_vector.
--
-- EXPAND-ONLY / non-destructive: the source keys are LEFT IN PLACE inside
-- products.content for backward-compatibility and safe rollback. The repository
-- now reads from these tables and overrides the (dormant) content copies. A
-- later cleanup migration may strip the redundant content keys once this change
-- is confirmed in production (see the commented block at the end of this file).
--
-- Transactional and idempotent. Safe on an empty database. Safe to re-run.
--
-- Apply with: npx tsx scripts/apply-migration.ts 006_normalize_product_presentational.sql
-- Then move image data to R2: npx tsx scripts/migrate-images-to-r2.ts
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual; run as a single transaction if needed):
--   DROP TRIGGER IF EXISTS product_benefits_refresh_search ON product_benefits;
--   DROP FUNCTION IF EXISTS trg_product_benefits_refresh_search();
--   -- restore the pre-006 FTS function (benefits term from content->'benefits'):
--   CREATE OR REPLACE FUNCTION trg_products_search_vector() RETURNS trigger AS $f$
--   BEGIN
--     NEW.search_vector :=
--       setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
--       setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
--       setweight(to_tsvector('english', jsonb_array_to_text(NEW.content->'benefits')), 'C') ||
--       setweight(to_tsvector('english', jsonb_array_to_text(NEW.content->'keywords')), 'C');
--     RETURN NEW;
--   END; $f$ LANGUAGE plpgsql;
--   UPDATE products SET search_vector = search_vector;
--   DROP TABLE IF EXISTS product_images, product_faqs, product_ingredients,
--                        product_tags, product_benefits;
--   -- (content still holds the original arrays, so no presentational data is lost.)
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
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
  image_url   TEXT NOT NULL DEFAULT '',
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

-- ---------------------------------------------------------------------------
-- 2. Backfill from content JSONB (idempotent: only when the table is empty).
--    Element ordinality is preserved as `position`.
-- ---------------------------------------------------------------------------
INSERT INTO product_images (product_id, url, alt_text, filename, position)
SELECT p.id,
       COALESCE(e.elem->>'url', ''),
       COALESCE(e.elem->>'altText', ''),
       COALESCE(e.elem->>'filename', ''),
       (e.ord - 1)::int
FROM products p,
     LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(p.content->'images') = 'array' THEN p.content->'images' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS e(elem, ord)
WHERE COALESCE(e.elem->>'url', '') <> ''
  AND NOT EXISTS (SELECT 1 FROM product_images);

INSERT INTO product_faqs (product_id, question, answer, position)
SELECT p.id,
       COALESCE(e.elem->>'question', ''),
       COALESCE(e.elem->>'answer', ''),
       (e.ord - 1)::int
FROM products p,
     LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(p.content->'faqs') = 'array' THEN p.content->'faqs' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS e(elem, ord)
WHERE (COALESCE(e.elem->>'question', '') <> '' OR COALESCE(e.elem->>'answer', '') <> '')
  AND NOT EXISTS (SELECT 1 FROM product_faqs);

INSERT INTO product_ingredients (product_id, name, image_url, description, alt_text, position)
SELECT p.id,
       COALESCE(e.elem->>'name', ''),
       COALESCE(e.elem->>'image', ''),
       COALESCE(e.elem->>'description', ''),
       COALESCE(e.elem->>'altText', ''),
       (e.ord - 1)::int
FROM products p,
     LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(p.content->'ingredients') = 'array' THEN p.content->'ingredients' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS e(elem, ord)
WHERE (COALESCE(e.elem->>'name', '') <> '' OR COALESCE(e.elem->>'description', '') <> '' OR COALESCE(e.elem->>'image', '') <> '')
  AND NOT EXISTS (SELECT 1 FROM product_ingredients);

INSERT INTO product_tags (product_id, title, color, position)
SELECT p.id,
       COALESCE(e.elem->>'title', ''),
       COALESCE(e.elem->>'color', ''),
       (e.ord - 1)::int
FROM products p,
     LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(p.content->'tags') = 'array' THEN p.content->'tags' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS e(elem, ord)
WHERE COALESCE(e.elem->>'title', '') <> ''
  AND NOT EXISTS (SELECT 1 FROM product_tags);

INSERT INTO product_benefits (product_id, text, position)
SELECT p.id,
       e.val,
       (e.ord - 1)::int
FROM products p,
     LATERAL jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(p.content->'benefits') = 'array' THEN p.content->'benefits' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS e(val, ord)
WHERE COALESCE(e.val, '') <> ''
  AND NOT EXISTS (SELECT 1 FROM product_benefits);

-- ---------------------------------------------------------------------------
-- 3. Full Text Search: benefits term now comes from product_benefits.
--    (name=A, short_description=B, benefits=C, content->keywords=C)
-- ---------------------------------------------------------------------------
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

-- When a product's benefits change, recompute the parent's search_vector by
-- firing the product BEFORE trigger via a no-op touch. No recursion: the
-- products trigger does not write product_benefits.
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

-- Rebuild every product's search_vector with the new logic (fires BEFORE trigger).
UPDATE products SET search_vector = search_vector;

COMMIT;

-- =============================================================================
-- OPTIONAL CLEANUP (DO NOT RUN until 006 + the updated app code are confirmed in
-- production). Reclaims the now-dormant JSONB space; makes rollback to pre-006
-- *code* impossible, so run only after the new code is stable:
--
--   BEGIN;
--   UPDATE products SET content = content
--     - 'images' - 'faqs' - 'ingredients' - 'tags' - 'benefits';
--   COMMIT;
-- =============================================================================
