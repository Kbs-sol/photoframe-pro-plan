import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listOrdersFn } from "@/lib/admin-orders.functions";
import { syncPendingOrdersFn } from "@/lib/admin-logistics.functions";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_admin/admin_/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

const PAY_STATUS = ["", "paid", "cod_pending", "pending", "failed", "refunded"] as const;
const FUL_STATUS = ["", "pending", "printing", "packed", "shipped", "delivered", "cancelled"] as const;

function OrdersPage() {
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState<string>("");
  const [fulfillment, setFulfillment] = useState<string>("");
  const fetchFn = useServerFn(listOrdersFn);
  const syncFn = useServerFn(syncPendingOrdersFn);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders", search, payment, fulfillment],
    queryFn: () => fetchFn({ data: { search: search || undefined, payment: payment || undefined, fulfillment: fulfillment || undefined, limit: 100 } }),
    staleTime: 15_000,
    retry: false,
  });

  // Bulk-sync unsynced orders to Shiprocket (ported from PhotoFramePFS)
  const syncPending = useMutation({
    mutationFn: () => syncFn({}),
    onSuccess: (r) => { toast.success(`Synced ${r.synced}/${r.total} orders to Shiprocket`); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.orders.length} shown` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncPending.mutate()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            disabled={syncPending.isPending}
          >
            {syncPending.isPending ? "Syncing…" : "Sync pending → Shiprocket"}
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            disabled={isFetching}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search order ID, email, phone, name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {PAY_STATUS.map((s) => <option key={s} value={s}>{s ? `Payment: ${s}` : "All payments"}</option>)}
        </select>
        <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {FUL_STATUS.map((s) => <option key={s} value={s}>{s ? `Fulfillment: ${s}` : "All fulfillment"}</option>)}
        </select>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{(error as Error).message}</div>}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Fulfillment</th>
              <th className="px-3 py-2">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td></tr>
            ))}
            {!isLoading && data?.orders.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">No orders match.</td></tr>
            )}
            {data?.orders.map((o) => (
              <tr key={o.id} className="hover:bg-accent/30">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary hover:underline">{o.id}</Link>
                </td>
                <td className="px-3 py-2">
                  <div>{o.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.email}</div>
                </td>
                <td className="px-3 py-2 font-medium">₹{(o.total / 100).toFixed(0)}</td>
                <td className="px-3 py-2"><StatusBadge status={o.payment_status} /></td>
                <td className="px-3 py-2"><StatusBadge status={o.fulfillment_status} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    cod_pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    pending: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    refunded: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    shipped: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    packed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    printing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    cancelled: "bg-destructive/15 text-destructive",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}