// Admin Reviews moderation.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any;

async function requireAdmin(email: string | null | undefined) {
  const { checkAdmin } = await import("./admin.server");
  const check = await checkAdmin(email);
  if (!check.isAdmin) throw new Error("Forbidden: not an admin");
}
async function getClient(): Promise<LooseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseClient;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  product_name?: string | null;
}

const listInput = z.object({
  status: z.enum(["all", "pending", "approved"]).default("all"),
});

export const listReviewsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    let q = sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(500);
    if (data.status === "pending") q = q.eq("is_approved", false);
    if (data.status === "approved") q = q.eq("is_approved", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(String(error));
    const reviews = (rows as ReviewRow[] | null) ?? [];

    const productIds = Array.from(new Set(reviews.map((r) => r.product_id)));
    let names = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: prods } = await sb.from("products").select("id, name").in("id", productIds);
      names = new Map(((prods as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));
    }
    return { reviews: reviews.map((r) => ({ ...r, product_name: names.get(r.product_id) ?? null })) };
  });

const idInput = z.object({ id: z.string().uuid() });

export const approveReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_approved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { error } = await sb.from("reviews").update({ is_approved: data.is_approved }).eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });

export const deleteReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { error } = await sb.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });