// Admin Coupons CRUD.
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

export interface CouponRow {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_discount: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listCouponsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(String(error));
    return { coupons: (data as CouponRow[] | null) ?? [] };
  });

const upsertInput = z.object({
  code: z.string().min(2).max(40).transform((s) => s.toUpperCase().trim()),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().min(0).max(10_000_000),
  min_order: z.number().int().min(0).max(10_000_000).default(0),
  max_discount: z.number().int().min(0).max(10_000_000).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  usage_limit: z.number().int().min(0).max(1_000_000).nullable().optional(),
  is_active: z.boolean().default(true),
  original_code: z.string().max(40).nullable().optional(),
});

export const upsertCouponFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const payload = {
      code: data.code,
      type: data.type,
      value: data.value,
      min_order: data.min_order,
      max_discount: data.max_discount ?? null,
      expires_at: data.expires_at ?? null,
      usage_limit: data.usage_limit ?? null,
      is_active: data.is_active,
    };
    if (data.original_code) {
      const { error } = await sb.from("coupons").update(payload).eq("code", data.original_code);
      if (error) throw new Error(String(error));
    } else {
      const { error } = await sb.from("coupons").insert(payload);
      if (error) throw new Error(String(error));
    }
    return { ok: true as const, code: data.code };
  });

const codeInput = z.object({ code: z.string().min(1).max(40) });

export const deleteCouponFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => codeInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { error } = await sb.from("coupons").delete().eq("code", data.code);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });

export const toggleCouponFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { error } = await sb.from("coupons").update({ is_active: data.is_active }).eq("code", data.code);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });