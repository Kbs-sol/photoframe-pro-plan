// Admin Logistics console — ported from PhotoFramePFS src/routes/admin.ts
// (LOGISTICS section). Shiprocket order creation, AWB assignment, pickup
// scheduling, label generation and bulk pending-order sync — all as
// TanStack Start server functions gated by requireSupabaseAuth + admin check.
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

const idInput = z.object({ orderId: z.string().min(1).max(60) });

/** Fetch an order row by id OR order_id (schema stores both, same value). */
async function fetchOrder(sb: LooseClient, orderId: string, cols = "*") {
  const { data } = await sb.from("orders").select(cols).eq("order_id", orderId).maybeSingle();
  if (data) return data;
  const { data: byId } = await sb.from("orders").select(cols).eq("id", orderId).maybeSingle();
  return byId;
}

/** Normalise a DB order row into the shape createShiprocketOrder expects.
 *  Handles both the PFS column set (customer_name/address/status) and the
 *  base column set (name/shipping_address). Prices are stored in rupees. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toShipmentOrder(row: any) {
  const addr = row.address || row.shipping_address || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (row.items || []).map((it: any) => ({
    name: it.name || "Photo Frame",
    sku: it.sku,
    variant_id: it.variantId || it.variant_id,
    size: it.size || "Medium",
    price: it.price ?? 0,
    quantity: it.qty ?? it.quantity ?? 1,
  }));
  return {
    order_id: row.order_id || row.id,
    customer_name: row.customer_name || row.name || "Customer",
    customer_email: row.customer_email || row.email,
    customer_phone: row.customer_phone || row.phone || "",
    payment_method: row.payment_method || (row.payment_status === "cod_pending" ? "cod" : "prepaid"),
    address: {
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
    },
    items,
  };
}

// ─── Create Shiprocket order(s) for an order ────────────────────────────────
export const createShiprocketOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const row = await fetchOrder(sb, data.orderId);
    if (!row) throw new Error("Order not found");
    if (row.shiprocket_order_id) {
      return { success: false as const, error: "Shiprocket order already created" };
    }

    const { createShiprocketOrder } = await import("./shipping.server");
    const result = await createShiprocketOrder(toShipmentOrder(row));

    if (result.success && result.shiprocketOrderIds) {
      await sb.from("orders").update({
        shiprocket_synced: true,
        shiprocket_order_id: result.shiprocketOrderIds.join(","),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
    return result;
  });

// ─── Generate AWB(s) ─────────────────────────────────────────────────────────
export const generateAwbFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const row = await fetchOrder(sb, data.orderId, "id, shiprocket_order_id");
    if (!row?.shiprocket_order_id) {
      return { success: false as const, error: "Shiprocket order not created yet" };
    }

    const { generateAWB } = await import("./shipping.server");
    const srIds: string[] = row.shiprocket_order_id.split(",");
    const awbs: string[] = [];
    const couriers: string[] = [];

    for (const srId of srIds) {
      const res = await generateAWB(srId.trim());
      if (res.success && res.awb) {
        awbs.push(res.awb);
        if (res.courier) couriers.push(res.courier);
      } else {
        return { success: false as const, error: `Failed for ${srId}: ${res.error}` };
      }
    }

    await sb.from("orders").update({
      awb_number: awbs.join(","),
      carrier: couriers.join(",") || null,
      tracking_carrier: couriers.join(",") || null,
      carrier_tracking_url: awbs.length ? `https://shiprocket.co/tracking/${awbs[0]}` : null,
      tracking_url: awbs.length ? `https://shiprocket.co/tracking/${awbs[0]}` : null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return { success: true as const, awb: awbs.join(","), courier: couriers.join(",") };
  });

// ─── Schedule pickup(s) ──────────────────────────────────────────────────────
export const schedulePickupFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const row = await fetchOrder(sb, data.orderId, "id, shiprocket_order_id");
    if (!row?.shiprocket_order_id) {
      return { success: false as const, error: "Shiprocket order not created yet" };
    }

    const { schedulePickup } = await import("./shipping.server");
    for (const srId of row.shiprocket_order_id.split(",")) {
      const res = await schedulePickup(srId.trim());
      if (!res.success) {
        return { success: false as const, error: `Failed for ${srId}: ${res.error}` };
      }
    }

    await sb.from("orders").update({
      pickup_status: "scheduled",
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return { success: true as const };
  });

// ─── Generate shipping label(s) ──────────────────────────────────────────────
export const generateLabelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const row = await fetchOrder(sb, data.orderId, "id, shiprocket_order_id");
    if (!row?.shiprocket_order_id) {
      return { success: false as const, error: "Order not synced to Shiprocket" };
    }

    const { generateLabel } = await import("./shipping.server");
    const labels: string[] = [];
    for (const srId of row.shiprocket_order_id.split(",")) {
      const res = await generateLabel(srId.trim());
      if (res.success && res.labelUrl) labels.push(res.labelUrl);
    }

    if (!labels.length) {
      return { success: false as const, error: "Failed to generate labels" };
    }

    await sb.from("orders").update({
      shiprocket_label_url: labels.join(","),
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return { success: true as const, labelUrls: labels };
  });

// ─── Sync all pending (unsynced) orders to Shiprocket ────────────────────────
export const syncPendingOrdersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { data: rows } = await sb
      .from("orders")
      .select("*")
      .is("shiprocket_order_id", null)
      .not("status", "in", "(cancelled,cod_pending,delivered)")
      .limit(20);

    const { createShiprocketOrder } = await import("./shipping.server");
    const results: Array<{ orderId: string; success: boolean; error?: string }> = [];

    for (const row of rows || []) {
      const result = await createShiprocketOrder(toShipmentOrder(row));
      if (result.success && result.shiprocketOrderIds) {
        await sb.from("orders").update({
          shiprocket_synced: true,
          shiprocket_order_id: result.shiprocketOrderIds.join(","),
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
      results.push({ orderId: row.order_id || row.id, success: result.success, error: result.error });
    }

    return {
      synced: results.filter((r) => r.success).length,
      total: results.length,
      results,
    };
  });
