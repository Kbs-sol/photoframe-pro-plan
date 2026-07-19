import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Truck } from "lucide-react";
import { getOrderFn, updateOrderFn, refundOrderFn } from "@/lib/admin-orders.functions";
import {
  createShiprocketOrderFn,
  generateAwbFn,
  schedulePickupFn,
  generateLabelFn,
} from "@/lib/admin-logistics.functions";

export const Route = createFileRoute("/_admin/admin_/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Admin" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

const FUL = ["pending", "printing", "packed", "shipped", "delivered", "cancelled"] as const;
const PAY = ["pending", "paid", "cod_pending", "failed", "refunded"] as const;

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getOrderFn);
  const doUpdate = useServerFn(updateOrderFn);
  const doRefund = useServerFn(refundOrderFn);
  const doCreateSr = useServerFn(createShiprocketOrderFn);
  const doAwb = useServerFn(generateAwbFn);
  const doPickup = useServerFn(schedulePickupFn);
  const doLabel = useServerFn(generateLabelFn);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => fetchOne({ data: { id } }),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => doUpdate({ data: { id, ...patch } as never }),
    onSuccess: () => { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["admin-order", id] }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refund = useMutation({
    mutationFn: () => doRefund({ data: { id } }),
    onSuccess: () => { toast.success("Refund initiated with Razorpay"); qc.invalidateQueries({ queryKey: ["admin-order", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Shiprocket logistics actions (ported from PhotoFramePFS admin logistics console)
  const logistics = useMutation({
    mutationFn: async (action: "create" | "awb" | "pickup" | "label") => {
      const payload = { data: { orderId: id } };
      const res =
        action === "create" ? await doCreateSr(payload)
        : action === "awb" ? await doAwb(payload)
        : action === "pickup" ? await doPickup(payload)
        : await doLabel(payload);
      if (!res.success) throw new Error(("error" in res && res.error) || "Action failed");
      return { action, res };
    },
    onSuccess: ({ action, res }) => {
      const msg =
        action === "create" ? "Shiprocket order created"
        : action === "awb" ? `AWB assigned: ${(res as { awb?: string }).awb ?? ""}`
        : action === "pickup" ? "Pickup scheduled"
        : "Label generated";
      toast.success(msg);
      if (action === "label" && "labelUrls" in res && Array.isArray(res.labelUrls) && res.labelUrls[0]) {
        window.open(res.labelUrls[0], "_blank");
      }
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [tracking, setTracking] = useState<{ url: string; carrier: string }>({ url: "", carrier: "" });
  const [notes, setNotes] = useState("");

  // Sync local edit state when the query loads
  useEffect(() => {
    if (data?.order) {
      setTracking({ url: data.order.tracking_url ?? "", carrier: data.order.tracking_carrier ?? "" });
      setNotes(data.order.notes ?? "");
    }
  }, [data?.order]);

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="p-8 text-sm text-destructive">{(error as Error | undefined)?.message ?? "Not found"}</div>;

  const o = data.order;
  const addr = o.shipping_address as { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  const items = o.items as Array<{ name?: string; variant?: string; qty?: number; price?: number; image?: string }>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">{o.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {new Date(o.created_at).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">₹{(o.total / 100).toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">
            Subtotal ₹{(o.subtotal / 100).toFixed(0)} · Shipping ₹{(o.shipping_fee / 100).toFixed(0)}
            {o.discount > 0 && ` · Discount −₹${(o.discount / 100).toFixed(0)}`}
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: items + address */}
        <div className="md:col-span-2 space-y-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Items</h2>
            <ul className="divide-y divide-border">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  {it.image && <img src={it.image} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{it.name ?? "Item"}</div>
                    <div className="text-xs text-muted-foreground">{it.variant ?? ""} · Qty {it.qty ?? 1}</div>
                  </div>
                  <div className="text-sm">₹{((it.price ?? 0) / 100).toFixed(0)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Shipping address</h2>
            <address className="not-italic text-sm text-muted-foreground">
              <div className="text-foreground">{o.name}</div>
              {addr.line1 && <div>{addr.line1}</div>}
              {addr.line2 && <div>{addr.line2}</div>}
              <div>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</div>
              {addr.country && <div>{addr.country}</div>}
              <div className="mt-2">{o.email}{o.phone ? ` · ${o.phone}` : ""}</div>
            </address>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Tracking</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input placeholder="Carrier (e.g. Delhivery)" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Tracking URL" value={tracking.url} onChange={(e) => setTracking({ ...tracking, url: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button
              onClick={() => update.mutate({ tracking_url: tracking.url || null, tracking_carrier: tracking.carrier || null })}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90" disabled={update.isPending}
            >
              Save tracking
            </button>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Internal notes</h2>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button
              onClick={() => update.mutate({ notes: notes || null })}
              className="mt-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
            >Save notes</button>
          </section>
        </div>

        {/* Right: status controls */}
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Payment</h2>
            <select value={o.payment_status} onChange={(e) => update.mutate({ payment_status: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {PAY.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {o.razorpay_payment_id && (
              <div className="mt-2 text-xs text-muted-foreground">RZP: <span className="font-mono">{o.razorpay_payment_id}</span></div>
            )}
            {o.payment_status === "paid" && o.razorpay_payment_id && (
              <button
                onClick={() => { if (confirm("Full refund via Razorpay?")) refund.mutate(); }}
                disabled={refund.isPending}
                className="mt-3 w-full rounded-md border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/15"
              >{refund.isPending ? "Refunding…" : "Refund via Razorpay"}</button>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Fulfillment</h2>
            <select value={o.fulfillment_status} onChange={(e) => update.mutate({ fulfillment_status: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {FUL.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </section>

          <section id="logistics-panel" className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Truck className="h-4 w-4" /> Shiprocket logistics</h2>
            {o.shiprocket_order_id ? (
              <div className="mb-2 text-xs text-muted-foreground">
                SR order: <span className="font-mono">{o.shiprocket_order_id}</span>
              </div>
            ) : (
              <p className="mb-2 text-xs text-muted-foreground">Not synced to Shiprocket yet.</p>
            )}
            <div className="grid gap-1.5">
              <button
                onClick={() => logistics.mutate("create")}
                disabled={logistics.isPending || Boolean(o.shiprocket_order_id)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >Create Shiprocket order</button>
              <button
                onClick={() => logistics.mutate("awb")}
                disabled={logistics.isPending || !o.shiprocket_order_id}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >Generate AWB</button>
              <button
                onClick={() => logistics.mutate("pickup")}
                disabled={logistics.isPending || !o.shiprocket_order_id}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >Schedule pickup</button>
              <button
                onClick={() => logistics.mutate("label")}
                disabled={logistics.isPending || !o.shiprocket_order_id}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >Generate label</button>
            </div>
          </section>

          {o.coupon_code && (
            <section className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="text-xs text-muted-foreground">Coupon applied</div>
              <div className="font-mono">{o.coupon_code}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}