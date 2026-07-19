import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { listCouponsFn, upsertCouponFn, deleteCouponFn, toggleCouponFn, type CouponRow } from "@/lib/admin-coupons.functions";

export const Route = createFileRoute("/_admin/admin_/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CouponsPage,
});

type FormState = {
  code: string;
  type: "percent" | "fixed";
  value: string;
  min_order: string;
  max_discount: string;
  expires_at: string;
  usage_limit: string;
  is_active: boolean;
  original_code: string | null;
};

const EMPTY: FormState = { code: "", type: "percent", value: "10", min_order: "0", max_discount: "", expires_at: "", usage_limit: "", is_active: true, original_code: null };

function CouponsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listCouponsFn);
  const doUpsert = useServerFn(upsertCouponFn);
  const doDelete = useServerFn(deleteCouponFn);
  const doToggle = useServerFn(toggleCouponFn);

  const { data, isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => fetchFn({ data: undefined as never }), retry: false });
  const [editing, setEditing] = useState<FormState | null>(null);

  const upsert = useMutation({
    mutationFn: (payload: Record<string, unknown>) => doUpsert({ data: payload as never }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (code: string) => doDelete({ data: { code } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (v: { code: string; is_active: boolean }) => doToggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(c: CouponRow) {
    setEditing({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order),
      max_discount: c.max_discount != null ? String(c.max_discount) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
      is_active: c.is_active,
      original_code: c.code,
    });
  }

  function submit() {
    if (!editing) return;
    upsert.mutate({
      code: editing.code,
      type: editing.type,
      value: Number(editing.value) || 0,
      min_order: Number(editing.min_order) || 0,
      max_discount: editing.max_discount ? Number(editing.max_discount) : null,
      expires_at: editing.expires_at ? new Date(editing.expires_at).toISOString() : null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      is_active: editing.is_active,
      original_code: editing.original_code,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data ? `${data.coupons.length} coupons` : "Loading…"}</p>
        </div>
        <button onClick={() => setEditing(EMPTY)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Min order</th>
              <th className="px-3 py-2">Usage</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data?.coupons.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No coupons yet.</td></tr>}
            {data?.coupons.map((c) => (
              <tr key={c.code} className="hover:bg-accent/30">
                <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                <td className="px-3 py-2">{c.type === "percent" ? `${c.value}%` : `₹${(c.value / 100).toFixed(0)}`}{c.max_discount ? ` (max ₹${(c.max_discount / 100).toFixed(0)})` : ""}</td>
                <td className="px-3 py-2">₹{(c.min_order / 100).toFixed(0)}</td>
                <td className="px-3 py-2">{c.times_used}{c.usage_limit != null ? ` / ${c.usage_limit}` : ""}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={c.is_active} onChange={(e) => toggle.mutate({ code: c.code, is_active: e.target.checked })} />
                    {c.is_active ? "Active" : "Off"}
                  </label>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(c)} className="mr-1 rounded p-1.5 hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete coupon ${c.code}?`)) del.mutate(c.code); }} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{editing.original_code ? "Edit coupon" : "New coupon"}</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Code</span>
                <input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} disabled={!!editing.original_code}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono uppercase disabled:opacity-50" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Type</span>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as "percent" | "fixed" })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2">
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed (in paise)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Value {editing.type === "percent" ? "(%)" : "(paise)"}</span>
                  <input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Min order (paise)</span>
                  <input type="number" value={editing.min_order} onChange={(e) => setEditing({ ...editing, min_order: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Max discount (paise)</span>
                  <input type="number" value={editing.max_discount} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Usage limit</span>
                  <input type="number" value={editing.usage_limit} onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Expires at</span>
                  <input type="datetime-local" value={editing.expires_at} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" />
                </label>
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
              <button onClick={submit} disabled={upsert.isPending || !editing.code} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}