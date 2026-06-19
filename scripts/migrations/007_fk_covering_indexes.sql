-- =============================================================================
-- Migration 007: add covering indexes on foreign-key columns that lacked one.
--
-- These FK columns had no index, so a parent-row delete (cascade / set-null) and
-- joins on them do a sequential scan. Tiny tables today, but the indexes are
-- standard hygiene and matter as the catalog/orders grow. Pure additive — no
-- schema, logic, contract, or data change. Idempotent.
--
-- Apply with: npx tsx scripts/apply-migration.ts 007_fk_covering_indexes.sql
--
-- ROLLBACK (safe, no data impact):
--   DROP INDEX IF EXISTS idx_cart_items_product, idx_cart_items_variant,
--     idx_coupon_usages_user, idx_order_items_product, idx_product_blogs_blog,
--     idx_product_testimonials_testimonial, idx_reviews_user;
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_cart_items_product            ON cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant            ON cart_items (variant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user            ON coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product           ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_product_blogs_blog            ON product_blogs (blog_id);
CREATE INDEX IF NOT EXISTS idx_product_testimonials_testimonial ON product_testimonials (testimonial_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user                 ON reviews (user_id);

COMMIT;
