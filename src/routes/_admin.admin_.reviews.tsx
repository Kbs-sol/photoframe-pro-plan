import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, Star } from "lucide-react";
import { listReviewsFn, approveReviewFn, deleteReviewFn } from "@/lib/admin-reviews.functions";

export const Route = createFileRoute("/_admin/admin_/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ReviewsPage,
});

type Tab = "all" | "pending" | "approved";

function ReviewsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const fetchFn = useServerFn(listReviewsFn);
  const doApprove = useServerFn(approveReviewFn);
  const doDelete = useServerFn(deleteReviewFn);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", tab],
    queryFn: () => fetchFn({ data: { status: tab } }),
    retry: false,
  });

  const approve = useMutation({
    mutationFn: (v: { id: string; is_approved: boolean }) => doApprove({ data: v }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Moderate customer reviews.</p>
      </header>

      <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5">
        {(["pending", "approved", "all"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data?.reviews.length === 0 && <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nothing here.</div>}
        {data?.reviews.map((r) => (
          <article key={r.id} className="rounded-lg border border-border bg-card p-4">
            <header className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.product_name ?? r.product_id} · {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_approved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                {r.is_approved ? "Approved" : "Pending"}
              </span>
            </header>
            {r.title && <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>}
            {r.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.body}</p>}
            <footer className="mt-3 flex justify-end gap-2">
              {!r.is_approved ? (
                <button onClick={() => approve.mutate({ id: r.id, is_approved: true })}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
              ) : (
                <button onClick={() => approve.mutate({ id: r.id, is_approved: false })}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent">
                  <X className="h-3.5 w-3.5" /> Hide
                </button>
              )}
              <button onClick={() => { if (confirm("Delete this review?")) del.mutate(r.id); }}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/15">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}