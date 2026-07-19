// Products CRUD server functions. All gated by requireSupabaseAuth + admin_users check.
// Uses the service-role client for writes since products/variants/images live in the
// user's own Supabase project (not in the auto-generated Database types).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror the schema)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  base_price: number;
  is_active: boolean;
  is_hidden: boolean;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}
export interface VariantRow {
  id: string;
  product_id: string;
  size: string;
  frame_type: string;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock_count: number;
  is_active: boolean;
}
export interface ImageRow {
  id: string;
  product_id: string;
  image_url: string;
  cloudinary_id: string | null;
  alt_text: string | null;
  display_order: number;
}
export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  display_order: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loose client — the tables live in the user's own Supabase project and are
// not in the auto-generated Database types shipped with this repo.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any;

async function requireAdmin(email: string | null | undefined) {
  const { checkAdmin } = await import("./admin.server");
  const check = await checkAdmin(email);
  if (!check.isAdmin) throw new Error("Forbidden: not an admin");
  return check;
}

async function getClient(): Promise<LooseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseClient;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ─────────────────────────────────────────────────────────────────────────────
// List products (with primary image + variant count)
// ─────────────────────────────────────────────────────────────────────────────
export const listProductsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: products, error } = await sb
      .from("products")
      .select("id, slug, name, base_price, is_active, is_hidden, total_orders, total_revenue, category_id, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(String(error));
    const rows = (products as ProductRow[] | null) ?? [];

    const [imgRes, varRes, catRes] = await Promise.all([
      sb.from("product_images").select("product_id, image_url, display_order").order("display_order", { ascending: true }),
      sb.from("product_variants").select("product_id, stock_count, is_active"),
      sb.from("categories").select("id, name").order("name", { ascending: true }),
    ]);

    const imagesByProduct = new Map<string, string>();
    for (const img of (imgRes.data as { product_id: string; image_url: string }[] | null) ?? []) {
      if (!imagesByProduct.has(img.product_id)) imagesByProduct.set(img.product_id, img.image_url);
    }
    const variantStats = new Map<string, { count: number; totalStock: number }>();
    for (const v of (varRes.data as { product_id: string; stock_count: number; is_active: boolean }[] | null) ?? []) {
      const cur = variantStats.get(v.product_id) ?? { count: 0, totalStock: 0 };
      cur.count += 1;
      cur.totalStock += v.stock_count;
      variantStats.set(v.product_id, cur);
    }
    const categories = (catRes.data as CategoryRow[] | null) ?? [];
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    return {
      products: rows.map((p) => ({
        ...p,
        thumb: imagesByProduct.get(p.id) ?? null,
        variant_count: variantStats.get(p.id)?.count ?? 0,
        total_stock: variantStats.get(p.id)?.totalStock ?? 0,
        category_name: p.category_id ? categoryName.get(p.category_id) ?? null : null,
      })),
      categories,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Get one product with variants + images + categories
// ─────────────────────────────────────────────────────────────────────────────
const idInput = z.object({ id: z.string().min(1) });

export const getProductFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: product, error } = await sb
      .from("products")
      .select("id, slug, name, description, category_id, base_price, is_active, is_hidden, total_orders, total_revenue, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !product) throw new Error("Product not found");

    const [imgRes, varRes, catRes] = await Promise.all([
      sb.from("product_images").select("id, product_id, image_url, cloudinary_id, alt_text, display_order").eq("product_id", data.id).order("display_order", { ascending: true }),
      sb.from("product_variants").select("id, product_id, size, frame_type, price, compare_at_price, sku, stock_count, is_active").eq("product_id", data.id).order("size", { ascending: true }),
      sb.from("categories").select("id, slug, name, display_order").order("display_order", { ascending: true }),
    ]);

    return {
      product: product as ProductRow,
      images: (imgRes.data as ImageRow[] | null) ?? [],
      variants: (varRes.data as VariantRow[] | null) ?? [],
      categories: (catRes.data as CategoryRow[] | null) ?? [],
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Upsert product (create if id absent, update otherwise)
// ─────────────────────────────────────────────────────────────────────────────
const upsertInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  base_price: z.number().int().min(0).max(10_000_000),
  is_active: z.boolean().default(true),
  is_hidden: z.boolean().default(false),
});

export const upsertProductFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const slug = (data.slug && data.slug.trim().length > 0 ? data.slug : slugify(data.name)) || slugify(data.name);

    if (data.id) {
      const { error } = await sb
        .from("products")
        .update({
          slug,
          name: data.name,
          description: data.description ?? null,
          category_id: data.category_id ?? null,
          base_price: data.base_price,
          is_active: data.is_active,
          is_hidden: data.is_hidden,
        })
        .eq("id", data.id);
      if (error) throw new Error(String(error));
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await sb
      .from("products")
      .insert({
        slug,
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id ?? null,
        base_price: data.base_price,
        is_active: data.is_active,
        is_hidden: data.is_hidden,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(String(error));
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Delete product (cascade removes variants + image rows; Cloudinary assets stay)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProductFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    // Best-effort destroy of Cloudinary assets first
    const { data: imgs } = await sb
      .from("product_images")
      .select("cloudinary_id")
      .eq("product_id", data.id)
      .order("display_order", { ascending: true });
    const { destroyCloudinaryAsset } = await import("./cloudinary.server");
    for (const row of (imgs as { cloudinary_id: string | null }[] | null) ?? []) {
      if (row.cloudinary_id) await destroyCloudinaryAsset(row.cloudinary_id).catch(() => false);
    }
    const { error } = await sb.from("products").delete().eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────────────────────────────────────
const variantInput = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  size: z.string().min(1).max(40),
  frame_type: z.string().min(1).max(40),
  price: z.number().int().min(0).max(10_000_000),
  compare_at_price: z.number().int().min(0).max(10_000_000).nullable().optional(),
  sku: z.string().max(60).nullable().optional(),
  stock_count: z.number().int().min(0).max(100_000).default(0),
  is_active: z.boolean().default(true),
});

export const upsertVariantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const payload = {
      product_id: data.product_id,
      size: data.size,
      frame_type: data.frame_type,
      price: data.price,
      compare_at_price: data.compare_at_price ?? null,
      sku: data.sku ?? null,
      stock_count: data.stock_count,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await sb.from("product_variants").update(payload).eq("id", data.id);
      if (error) throw new Error(String(error));
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await sb
      .from("product_variants")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) throw new Error(String(error));
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deleteVariantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { error } = await sb.from("product_variants").delete().eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Images: signed upload params + save DB row + delete
// ─────────────────────────────────────────────────────────────────────────────
export const getUploadSignatureFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const { getSignedUploadParams } = await import("./cloudinary.server");
    return getSignedUploadParams("products");
  });

const saveImageInput = z.object({
  product_id: z.string().uuid(),
  image_url: z.string().url().max(1000),
  cloudinary_id: z.string().max(300).nullable().optional(),
  alt_text: z.string().max(200).nullable().optional(),
  display_order: z.number().int().min(0).max(1000).default(0),
});

export const saveProductImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveImageInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: inserted, error } = await sb
      .from("product_images")
      .insert({
        product_id: data.product_id,
        image_url: data.image_url,
        cloudinary_id: data.cloudinary_id ?? null,
        alt_text: data.alt_text ?? null,
        display_order: data.display_order,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(String(error));
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deleteProductImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: row } = await sb
      .from("product_images")
      .select("cloudinary_id")
      .eq("id", data.id)
      .maybeSingle();
    const cid = (row as { cloudinary_id: string | null } | null)?.cloudinary_id ?? null;
    if (cid) {
      const { destroyCloudinaryAsset } = await import("./cloudinary.server");
      await destroyCloudinaryAsset(cid).catch(() => false);
    }
    const { error } = await sb.from("product_images").delete().eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });