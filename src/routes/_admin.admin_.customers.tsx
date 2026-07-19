import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { listCustomersFn } from "@/lib/admin-customers.functions";

export const Route = createFileRoute("/_admin/admin_/customers")({
  head: () => ({ meta: [{ title: "Customers — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const fetchFn = useServerFn(listCustomersFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchFn({ data: undefined as never }),
    staleTime: 30_000,
    retry: false,
  });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data.customers;
    return data.customers.filter((c) =>
      c.email.includes(s) || (c.name ?? "").toLowerCase().includes(s) || (c.phone ?? "").includes(s)
    );
  }, [data, search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.customers.length} unique customers` : "Loading…"}
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search by email, name, or phone" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm outline-none focus:border-primary" />
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{(error as Error).message}</div>}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Orders</th>
              <th className="px-3 py-2">Total spent</th>
              <th className="px-3 py-2">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">No customers yet.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.email} className="hover:bg-accent/30">
                <td className="px-3 py-2">
                  <div className="font-medium">{c.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="px-3 py-2">{c.orders_count}</td>
                <td className="px-3 py-2 font-medium">₹{(c.total_spent / 100).toFixed(0)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}