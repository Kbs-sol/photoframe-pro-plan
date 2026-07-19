// Admin Customers — aggregated from orders + profiles.
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

export interface CustomerSummary {
  email: string;
  name: string | null;
  phone: string | null;
  user_id: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  first_order_at: string | null;
}

export const listCustomersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: orders, error } = await sb
      .from("orders")
      .select("email, name, phone, user_id, total, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(String(error));

    const byEmail = new Map<string, CustomerSummary>();
    for (const o of (orders as Array<{
      email: string; name: string | null; phone: string | null; user_id: string | null;
      total: number; payment_status: string; created_at: string;
    }> | null) ?? []) {
      const key = (o.email ?? "").toLowerCase();
      if (!key) continue;
      const cur = byEmail.get(key);
      const paid = o.payment_status === "paid" || o.payment_status === "cod_pending";
      if (!cur) {
        byEmail.set(key, {
          email: key,
          name: o.name,
          phone: o.phone,
          user_id: o.user_id,
          orders_count: 1,
          total_spent: paid ? o.total : 0,
          last_order_at: o.created_at,
          first_order_at: o.created_at,
        });
      } else {
        cur.orders_count += 1;
        if (paid) cur.total_spent += o.total;
        if (o.created_at > (cur.last_order_at ?? "")) cur.last_order_at = o.created_at;
        if (!cur.first_order_at || o.created_at < cur.first_order_at) cur.first_order_at = o.created_at;
        if (!cur.name && o.name) cur.name = o.name;
        if (!cur.phone && o.phone) cur.phone = o.phone;
        if (!cur.user_id && o.user_id) cur.user_id = o.user_id;
      }
    }
    const rows = Array.from(byEmail.values()).sort((a, b) => (b.last_order_at ?? "").localeCompare(a.last_order_at ?? ""));
    return { customers: rows };
  });

const emailInput = z.object({ email: z.string().email() });

export const getCustomerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const email = data.email.trim().toLowerCase();
    const { data: orders, error } = await sb
      .from("orders")
      .select("id, total, subtotal, shipping_fee, discount, payment_status, fulfillment_status, created_at, items")
      .ilike("email", email)
      .order("created_at", { ascending: false });
    if (error) throw new Error(String(error));
    return { email, orders: orders ?? [] };
  });