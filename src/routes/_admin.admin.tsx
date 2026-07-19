import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboardFn } from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/_admin/admin")({
  head: () => ({
    meta: [{ title: "Admin — ChitraFrame" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchFn = useServerFn(getAdminDashboardFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchFn({ data: undefined as never }),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-destructive">
        Failed to load dashboard: {error instanceof Error ? error.message : "unknown"}
      </div>
    );
  }

  const cards = [
    { label: "Orders today", value: data.ordersToday, sub: `${data.revenueToday} today` },
    { label: "Pending fulfillment", value: data.pendingFulfillment, sub: "printing + packed + pickup" },
    { label: "COD to confirm", value: data.codPending, sub: "awaiting confirmation" },
    { label: "Reviews to approve", value: data.pendingReviews, sub: "in moderation" },
    { label: "Low stock", value: data.lowStockCount, sub: "variants ≤ 5" },
    { label: "Damage claims", value: data.openDamageClaims, sub: "pending" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </section>

      {data.recentOrders.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recent orders</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentOrders.map((o: typeof data.recentOrders[number]) => (
                  <tr key={o.order_id}>
                    <td className="px-3 py-2 font-mono text-xs">{o.order_id}</td>
                    <td className="px-3 py-2">{o.customer_name}</td>
                    <td className="px-3 py-2">₹{(o.total / 100).toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}