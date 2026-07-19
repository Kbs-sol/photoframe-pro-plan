// Free-tier resource usage monitor + alert engine — ported from PhotoFramePFS
// src/routes/admin.ts (/usage, /test-alert) and src/lib/alerts.ts.
// Tracks Cloudflare worker requests (proxied via funnel events), Supabase row
// counts, and daily email sends against configurable limits in system_config.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export interface UsageReport {
  cloudflare: {
    worker_requests_monthly: number;
    worker_limit: number;
    daily_requests_proxy: number;
    daily_limit: number;
  };
  supabase: {
    total_rows: number;
    row_limit: number;
  };
  email: {
    brevo: { sent: number; limit: number };
    resend: { sent: number; limit: number };
  };
  funnel: Record<string, number>;
  last_updated: string;
}

/** Aggregate usage stats for the admin dashboard. */
export const getUsageReportFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageReport> => {
    await requireAdmin(context.claims?.email as string | undefined);
    const sb = await getClient();
    const { getConfigs } = await import("./supabase.server");

    const config = await getConfigs([
      "worker_monthly_limit",
      "supabase_row_limit",
      "brevo_daily_limit",
      "resend_daily_limit",
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${today.slice(0, 7)}-01T00:00:00Z`;

    const [
      monthlyReqRes,
      productRes,
      imageRes,
      orderRes,
      brevoRes,
      resendRes,
      funnelRes,
    ] = await Promise.all([
      sb.from("sales_funnel_events").select("*", { count: "exact", head: true }).gte("created_at", firstOfMonth),
      sb.from("products").select("*", { count: "exact", head: true }),
      sb.from("product_images").select("*", { count: "exact", head: true }),
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb.from("email_log").select("*", { count: "exact", head: true }).eq("service", "brevo").gte("created_at", `${today}T00:00:00Z`),
      sb.from("email_log").select("*", { count: "exact", head: true }).eq("service", "resend").gte("created_at", `${today}T00:00:00Z`),
      sb.from("sales_funnel_events").select("event_type").gte("created_at", firstOfMonth).limit(10000),
    ]);

    // Funnel breakdown (this month)
    const funnel: Record<string, number> = {};
    for (const row of (funnelRes.data as Array<{ event_type: string }> | null) ?? []) {
      funnel[row.event_type] = (funnel[row.event_type] ?? 0) + 1;
    }

    const monthlyRequests = monthlyReqRes.count ?? 0;
    const workerLimit = parseInt(config.worker_monthly_limit || "3000000");

    return {
      cloudflare: {
        worker_requests_monthly: monthlyRequests,
        worker_limit: workerLimit,
        daily_requests_proxy: monthlyRequests ? Math.round(monthlyRequests / new Date().getDate()) : 0,
        daily_limit: Math.round(workerLimit / 30),
      },
      supabase: {
        total_rows: (productRes.count ?? 0) + (imageRes.count ?? 0) + (orderRes.count ?? 0),
        row_limit: parseInt(config.supabase_row_limit || "50000"),
      },
      email: {
        brevo: { sent: brevoRes.count ?? 0, limit: parseInt(config.brevo_daily_limit || "300") },
        resend: { sent: resendRes.count ?? 0, limit: parseInt(config.resend_daily_limit || "100") },
      },
      funnel,
      last_updated: new Date().toISOString(),
    };
  });

/** Send a test alert email to the configured owner address. */
export const sendTestAlertFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.claims?.email as string | undefined);
    const { sendOwnerAlert } = await import("./email.server");
    await sendOwnerAlert(
      "Alert System Test",
      `<h2>🔔 Alert System Test Successful</h2>
       <p>This is a manual test of your resource alert system.</p>
       <p>Sent at: ${new Date().toLocaleString()}</p>`,
    );
    return { success: true as const, message: "Test alert sent to your email." };
  });
