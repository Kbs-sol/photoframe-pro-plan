-- PhotoFrame Pro — migration 002
-- Ports the PhotoFramePFS backend schema surface into the base schema (001).
-- Adds: PFS-parity order columns (logistics, COD, UTM), customers,
-- damage_claims, coupon_usage, leads, sales_funnel_events (analytics funnel).
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS everywhere).

-- ─────────────────────────────────────────────────────────────────────────────
-- orders — PFS-parity columns used by src/lib/orders.functions.ts,
-- checkout.functions.ts, admin-logistics.functions.ts and track page.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id            TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id         UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name       TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone      TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email      TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address             JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_charge     INT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cod_fee             INT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method      TEXT DEFAULT 'prepaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id          TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status              TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_source     TEXT DEFAULT 'custom';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_synced   BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS awb_number          TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier             TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_label_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS volumetric_weight   TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_source          TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_medium          TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign        TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_status        TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_status       TEXT DEFAULT 'not_scheduled';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cod_confirmed       BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_replacement      BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS linked_order_id     TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes         TEXT;

-- Keep order_id mirrored to id for rows created before this migration.
UPDATE public.orders SET order_id = id WHERE order_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_awb     ON public.orders(awb_number);
CREATE INDEX IF NOT EXISTS idx_orders_cust_phone ON public.orders(customer_phone);

-- ─────────────────────────────────────────────────────────────────────────────
-- customers — used by orders.functions.ts + admin panel (from PFS unified.sql)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  phone         TEXT,
  total_orders  INT DEFAULT 0,
  total_spent   INT DEFAULT 0,
  notes         TEXT,
  is_blocked    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Home',
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- damage_claims — "Dispute Shield" replacement workflow (from PFS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.damage_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL,
  customer_email TEXT,
  description   TEXT,
  media_urls    JSONB DEFAULT '[]',
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','replaced')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_damage_order ON public.damage_claims(order_id);
GRANT ALL ON public.damage_claims TO service_role;
ALTER TABLE public.damage_claims ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- coupon_usage — per-customer usage tracking (from PFS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code   TEXT NOT NULL,
  customer_id   UUID,
  order_id      TEXT,
  used_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_code ON public.coupon_usage(coupon_code);
GRANT ALL ON public.coupon_usage TO service_role;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- leads — email/WhatsApp capture for remarketing (from PFS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT,
  phone         TEXT,
  name          TEXT,
  source        TEXT DEFAULT 'popup',          -- popup | checkout_abandon | footer
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- sales_funnel_events — conversion analytics funnel (from PFS analytics.ts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_funnel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,                 -- page_view | product_view | add_to_cart | begin_checkout | purchase
  product_id    TEXT,
  order_id      TEXT,
  session_id    TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funnel_type    ON public.sales_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON public.sales_funnel_events(created_at DESC);
GRANT ALL ON public.sales_funnel_events TO service_role;
ALTER TABLE public.sales_funnel_events ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- system_config defaults used by the ported backend (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.system_config (key, value) VALUES
  ('free_shipping_threshold', '999'),
  ('pickup_pincode', '501504'),
  ('cod_fee', '49'),
  ('worker_monthly_limit', '3000000'),
  ('supabase_row_limit', '50000'),
  ('brevo_daily_limit', '300'),
  ('resend_daily_limit', '100'),
  ('alert_threshold_percentage', '85'),
  ('alert_cooldown_hours', '24')
ON CONFLICT (key) DO NOTHING;
