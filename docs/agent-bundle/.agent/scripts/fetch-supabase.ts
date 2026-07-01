// Fetch product catalog, review counts, and abandoned-cart snapshot from Supabase.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DAYS
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");
const days = Number(process.env.DAYS ?? "7");
const sb = createClient(url, key, { auth: { persistSession: false } });

const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

const [products, variants, reviews, orders] = await Promise.all([
  sb.from("products").select("id,slug,title,category,is_placeholder,created_at"),
  sb.from("product_variants").select("id,product_id,sku,size,frame_type,price,in_stock"),
  sb
    .from("reviews")
    .select("id,product_id,rating,body,created_at")
    .gte("created_at", since),
  sb
    .from("orders")
    .select("id,status,total,payment_method,created_at")
    .gte("created_at", since),
]);

const errors = [products.error, variants.error, reviews.error, orders.error].filter(Boolean);
if (errors.length) {
  console.warn("Supabase warnings:", errors);
}

const summary = {
  productCount: products.data?.length ?? 0,
  placeholderCount: products.data?.filter((p) => p.is_placeholder).length ?? 0,
  variantCount: variants.data?.length ?? 0,
  outOfStock: variants.data?.filter((v) => !v.in_stock).length ?? 0,
  reviewsInWindow: reviews.data?.length ?? 0,
  ordersInWindow: orders.data?.length ?? 0,
};

await Bun.write(
  "out/supabase.json",
  JSON.stringify(
    { summary, products: products.data, variants: variants.data, reviews: reviews.data, orders: orders.data },
    null,
    2,
  ),
);
console.log("Supabase:", summary);
