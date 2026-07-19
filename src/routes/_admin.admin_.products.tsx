import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProductsFn } from "@/lib/admin-products.functions";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_admin/admin_/products")({
  head: () => ({
    meta: [{ title: "Products — ChitraFrame Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductsListPage,
});

function ProductsListPage() {
  const fetchFn = useServerFn(listProductsFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchFn({ data: undefined as never }),
    staleTime: 10_000,
    retry: false,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.products.length} total` : "Loading…"}
          </p>
        </div>
        <Link
          to="/admin/products/$id"
          params={{ id: "new" }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New product
        </Link>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted/30" />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Failed to load: {error instanceof Error ? error.message : "unknown"}
        </p>
      )}

      {data && data.products.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No products yet.</p>
          <Link
            to="/admin/products/$id"
            params={{ id: "new" }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create your first product
          </Link>
        </div>
      )}

      {data && data.products.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Base price</th>
                <th className="px-3 py-2">Variants</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {data.products.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      to="/admin/products/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-3"
                    >
                      {p.thumb ? (
                        <img
                          src={p.thumb}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.category_name ?? "—"}</td>
                  <td className="px-3 py-2">₹{(p.base_price / 100).toFixed(0)}</td>
                  <td className="px-3 py-2">{p.variant_count}</td>
                  <td className="px-3 py-2">
                    <span className={p.total_stock <= 5 ? "text-destructive" : ""}>
                      {p.total_stock}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.is_hidden ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Hidden</span>
                    ) : p.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Draft</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}