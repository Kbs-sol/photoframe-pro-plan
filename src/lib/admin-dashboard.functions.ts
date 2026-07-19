// Dashboard KPI aggregation for /admin. Requires signed-in admin user.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DashboardRecentOrder {
  order_id: string;
  customer_name: string;
  total: number;
  status: string;
}

export interface DashboardData {
  generatedAt: string;
  ordersToday: number;
  revenueToday: string;
  pendingFulfillment: number;
  codPending: number;
  pendingReviews: number;
  lowStockCount: number;
  openDamageClaims: number;
  recentOrders: DashboardRecentOrder[];
}

export const getAdminDashboardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const email = (context.claims?.email as string | undefined) ?? null;
    const { checkAdmin } = await import("./admin.server");
    const gate = await checkAdmin(email);
    if (!gate.isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Bypass generated types (user's schema, not shipped in Database).
    const sb = supabaseAdmin as unknown as {
      from: (t: string) => any;
    };

    const startOfDayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [
      ordersTodayRes,
      revenueTodayRes,
      pendingRes,
      codRes,
      reviewsRes,
      lowStockRes,
      damageRes,
      recentRes,
    ] = await Promise.all([
      sb.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startOfDayIso),
      sb.from("orders").select("total").gte("created_at", startOfDayIso).eq("status", "delivered"),
      sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["printing", "packed", "pickup_scheduled"]),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("payment_method", "cod").eq("cod_confirmed", false).eq("status", "cod_pending"),
      sb.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_hidden", false),
      sb.from("product_variants").select("id", { count: "exact", head: true }).lte("stock_count", 5).eq("is_active", true),
      sb.from("damage_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("orders").select("order_id, customer_name, total, status").order("created_at", { ascending: false }).limit(10),
    ]);

    const revenueTodayPaise = ((revenueTodayRes.data as Array<{ total: number }> | null) ?? [])
      .reduce((sum, r) => sum + (r.total ?? 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      ordersToday: ordersTodayRes.count ?? 0,
      revenueToday: `₹${(revenueTodayPaise / 100).toFixed(0)}`,
      pendingFulfillment: pendingRes.count ?? 0,
      codPending: codRes.count ?? 0,
      pendingReviews: reviewsRes.count ?? 0,
      lowStockCount: lowStockRes.count ?? 0,
      openDamageClaims: damageRes.count ?? 0,
      recentOrders: (recentRes.data as DashboardRecentOrder[] | null) ?? [],
    };
  });