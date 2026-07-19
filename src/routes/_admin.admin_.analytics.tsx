// Admin Analytics — resource usage + sales funnel, powered by the backend
// ported from PhotoFramePFS (/api/admin/usage + sales_funnel_events).
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, Database, Mail, Filter, BellRing } from "lucide-react";
import { getUsageReportFn, sendTestAlertFn } from "@/lib/admin-usage.functions";

export const Route = createFileRoute("/_admin/admin_/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsPage,
});

const FUNNEL_ORDER = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "payment_started",
  "purchase",
] as const;

const FUNNEL_LABELS: Record<string, string> = {
  page_view: "Page views",
  product_view: "Product views",
  add_to_cart: "Add to cart",
  begin_checkout: "Begin checkout",
  payment_started: "Payment started",
  purchase: "Purchases",
  cod_selected: "COD selected",
};

function AnalyticsPage() {
  const fetchUsage = useServerFn(getUsageReportFn);
  const testAlert = useServerFn(sendTestAlertFn);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-usage"],
    queryFn: () => fetchUsage({}),
    staleTime: 60_000,
    retry: false,
  });

  const alertTest = useMutation({
    mutationFn: () => testAlert({}),
    onSuccess: (r) => toast.success(r.message),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error || !data) {
    return (
      <div className="p-8 text-sm text-destructive">
        {(error as Error | undefined)?.message ?? "Failed to load analytics"}
      </div>
    );
  }

  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((k) => data.funnel[k] ?? 0));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics & usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sales funnel + free-tier resource monitor · updated {new Date(data.last_updated).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => alertTest.mutate()}
          disabled={alertTest.isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          <BellRing className="h-4 w-4" />
          {alertTest.isPending ? "Sending…" : "Send test alert"}
        </button>
      </header>

      {/* Sales funnel */}
      <section id="sales-funnel" className="mb-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
          <Filter className="h-4 w-4" /> Sales funnel (this month)
        </h2>
        <div className="space-y-2.5">
          {FUNNEL_ORDER.map((k) => {
            const v = data.funnel[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs text-muted-foreground">{FUNNEL_LABELS[k]}</div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/70"
                    style={{ width: `${Math.max(2, (v / maxFunnel) * 100)}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right text-sm font-medium">{v.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
        {Object.keys(data.funnel).length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            No funnel events yet — events are recorded via <code>trackFunnelEventFn</code> as customers browse.
          </p>
        )}
      </section>

      {/* Resource usage */}
      <div className="grid gap-4 md:grid-cols-3">
        <UsageCard
          icon={<Activity className="h-4 w-4" />}
          title="Worker requests (mo)"
          used={data.cloudflare.worker_requests_monthly}
          limit={data.cloudflare.worker_limit}
          hint={`~${data.cloudflare.daily_requests_proxy.toLocaleString()}/day of ${data.cloudflare.daily_limit.toLocaleString()}`}
        />
        <UsageCard
          icon={<Database className="h-4 w-4" />}
          title="Supabase rows"
          used={data.supabase.total_rows}
          limit={data.supabase.row_limit}
          hint="products + images + orders"
        />
        <UsageCard
          icon={<Mail className="h-4 w-4" />}
          title="Emails today"
          used={data.email.brevo.sent + data.email.resend.sent}
          limit={data.email.brevo.limit + data.email.resend.limit}
          hint={`Brevo ${data.email.brevo.sent}/${data.email.brevo.limit} · Resend ${data.email.resend.sent}/${data.email.resend.limit}`}
        />
      </div>
    </div>
  );
}

function UsageCard({
  icon,
  title,
  used,
  limit,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  used: number;
  limit: number;
  hint?: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const barColor = pct >= 85 ? "bg-destructive" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon} {title}
      </h3>
      <div className="text-lg font-semibold">
        {used.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {limit.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
        <div className={`h-full rounded ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{pct}% used</span>
        {hint && <span>{hint}</span>}
      </div>
    </section>
  );
}
