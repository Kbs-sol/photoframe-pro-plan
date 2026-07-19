// Admin Orders CRUD + Razorpay refund. All gated by requireSupabaseAuth + admin.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

export interface OrderRow {
  id: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shipping_address: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  payment_status: string;
  fulfillment_status: string;
  tracking_url: string | null;
  tracking_carrier: string | null;
  shiprocket_order_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── List ───────────────────────────────────────────────────────────────────
const listInput = z.object({
  search: z.string().max(120).optional(),
  payment: z.string().max(30).optional(),
  fulfillment: z.string().max(30).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    let q = sb.from("orders").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.payment) q = q.eq("payment_status", data.payment);
    if (data.fulfillment) q = q.eq("fulfillment_status", data.fulfillment);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`id.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,name.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(String(error));
    return { orders: (rows as OrderRow[] | null) ?? [] };
  });

// ─── Get one ────────────────────────────────────────────────────────────────
const idInput = z.object({ id: z.string().min(1) });

export const getOrderFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: row, error } = await sb.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Order not found");
    return { order: row as OrderRow };
  });

// ─── Update status / tracking / notes ───────────────────────────────────────
const updateInput = z.object({
  id: z.string().min(1),
  payment_status: z.enum(["pending", "paid", "failed", "refunded", "cod_pending"]).optional(),
  fulfillment_status: z.enum(["pending", "printing", "packed", "shipped", "delivered", "cancelled"]).optional(),
  tracking_url: z.string().url().max(1000).nullable().optional(),
  tracking_carrier: z.string().max(80).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const updateOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const patch: Record<string, unknown> = {};
    if (data.payment_status !== undefined) patch.payment_status = data.payment_status;
    if (data.fulfillment_status !== undefined) patch.fulfillment_status = data.fulfillment_status;
    if (data.tracking_url !== undefined) patch.tracking_url = data.tracking_url;
    if (data.tracking_carrier !== undefined) patch.tracking_carrier = data.tracking_carrier;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await sb.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true as const };
  });

// ─── Razorpay refund ────────────────────────────────────────────────────────
const refundInput = z.object({
  id: z.string().min(1),
  amount: z.number().int().min(0).optional(), // paise; omit for full refund
});

export const refundOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refundInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: row, error } = await sb
      .from("orders")
      .select("id, payment_status, razorpay_payment_id, total")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Order not found");
    const order = row as { id: string; payment_status: string; razorpay_payment_id: string | null; total: number };
    if (!order.razorpay_payment_id) throw new Error("No Razorpay payment on this order (COD or unpaid)");
    if (order.payment_status === "refunded") throw new Error("Already refunded");

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const body: Record<string, unknown> = { speed: "normal" };
    if (data.amount && data.amount > 0) body.amount = data.amount;

    const res = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Razorpay refund failed: ${res.status} ${text}`);
    }
    const refund = (await res.json()) as { id: string; amount: number; status: string };
    await sb.from("orders").update({ payment_status: "refunded" }).eq("id", order.id);
    return { ok: true as const, refund };
  });