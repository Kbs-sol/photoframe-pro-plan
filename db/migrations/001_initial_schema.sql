-- ChitraFrame — initial schema (001)
-- Run this in YOUR Supabase project: SQL Editor → New query → paste → Run.
-- Not managed by Lovable — this file lives outside supabase/migrations/ on purpose.
-- Safe to re-run on a fresh DB (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Order: extensions → enums → shared trigger fn → tables (with grants + RLS + policies) → RPCs → seeds.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.payment_status_t     AS ENUM ('pending','paid','failed','refunded','partial_refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fulfillment_status_t AS ENUM ('pending','processing','shipped','delivered','cancelled','returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_type_t        AS ENUM ('percent','flat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared updated_at trigger fn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- profiles  (mirrors auth.users; auto-created via trigger below)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on new auth.users row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═════════════════════════════════════════════════════════════════════════════
-- categories
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  hover_color    TEXT,
  display_order  INT  NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- products
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT,
  category_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  base_price     INT  NOT NULL DEFAULT 0,           -- paise
  is_active      BOOLEAN NOT NULL DEFAULT true,
  is_hidden      BOOLEAN NOT NULL DEFAULT false,
  total_orders   INT  NOT NULL DEFAULT 0,
  total_revenue  BIGINT NOT NULL DEFAULT 0,          -- paise
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON public.products(is_active, is_hidden);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated USING (is_active = true AND is_hidden = false);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- product_images
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.product_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url      TEXT NOT NULL,               -- Cloudinary secure_url
  cloudinary_id  TEXT,                        -- public_id, for destroy
  alt_text       TEXT,
  display_order  INT  NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, display_order);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_images_public_read ON public.product_images;
CREATE POLICY product_images_public_read ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- product_variants
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.product_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size             TEXT NOT NULL,
  frame_type       TEXT NOT NULL,
  price            INT  NOT NULL,
  compare_at_price INT,
  sku              TEXT UNIQUE,
  stock_count      INT  NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, size, frame_type)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS variants_public_read ON public.product_variants;
CREATE POLICY variants_public_read ON public.product_variants
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP TRIGGER IF EXISTS trg_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- coupons  (server-fn only)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.coupons (
  code          TEXT PRIMARY KEY,
  type          public.coupon_type_t NOT NULL,
  value         INT  NOT NULL,
  min_order     INT  NOT NULL DEFAULT 0,
  max_discount  INT,
  expires_at    TIMESTAMPTZ,
  usage_limit   INT,
  times_used    INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Intentionally: no anon/authenticated policies — all coupon access via server fn.

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- order_sequence + increment_order_sequence RPC
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.order_sequence (
  date_key       TEXT PRIMARY KEY,             -- "YYMMDD"
  last_sequence  INT  NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_sequence TO service_role;
ALTER TABLE public.order_sequence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_order_sequence(p_date_key TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_seq INT;
BEGIN
  INSERT INTO public.order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_sequence = public.order_sequence.last_sequence + 1,
        updated_at = now()
  RETURNING last_sequence INTO next_seq;
  RETURN next_seq;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_order_sequence(TEXT) TO service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- orders
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.orders (
  id                    TEXT PRIMARY KEY,                              -- PS-YYMMDD-XXXX
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  name                  TEXT,
  shipping_address      JSONB NOT NULL,
  items                 JSONB NOT NULL,
  subtotal              INT  NOT NULL,
  shipping_fee          INT  NOT NULL DEFAULT 0,
  discount              INT  NOT NULL DEFAULT 0,
  total                 INT  NOT NULL,
  coupon_code           TEXT REFERENCES public.coupons(code) ON DELETE SET NULL,
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  payment_status        public.payment_status_t     NOT NULL DEFAULT 'pending',
  fulfillment_status    public.fulfillment_status_t NOT NULL DEFAULT 'pending',
  tracking_url          TEXT,
  tracking_carrier      TEXT,
  shiprocket_order_id   TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email   ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfil  ON public.orders(fulfillment_status);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- reviews
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id     TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  is_approved  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id, is_approved);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_approved = true);
DROP POLICY IF EXISTS reviews_select_own ON public.reviews;
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- system_config
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.system_config TO service_role;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
-- Server-fn only. No public policies.

-- ═════════════════════════════════════════════════════════════════════════════
-- Ops tables
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.email_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient     TEXT NOT NULL,
  type          TEXT NOT NULL,
  subject       TEXT,
  service       TEXT,
  status        TEXT NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON public.email_log(created_at DESC);
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_failures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient    TEXT NOT NULL,
  type         TEXT NOT NULL,
  subject      TEXT,
  body         TEXT,
  last_error   TEXT,
  retry_count  INT NOT NULL DEFAULT 0,
  resolved     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_failures TO service_role;
ALTER TABLE public.email_failures ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.error_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id         TEXT UNIQUE,
  endpoint       TEXT,
  method         TEXT,
  error_message  TEXT,
  stack_trace    TEXT,
  request_body   JSONB,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_error_log_created ON public.error_log(created_at DESC);
GRANT ALL ON public.error_log TO service_role;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.categories (slug, name, hover_color, display_order) VALUES
  ('devotional',   'Devotional',   '#7a1f1f', 10),
  ('custom-frame', 'Custom Frame', '#c58a3a', 20)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.system_config (key, value) VALUES
  ('free_shipping_threshold', '999'),
  ('banner_text',             'Free shipping on orders above ₹999'),
  ('checkout_notice',         '')
ON CONFLICT (key) DO NOTHING;

-- Done. Run `SELECT table_name FROM information_schema.tables WHERE table_schema='public';` to verify.