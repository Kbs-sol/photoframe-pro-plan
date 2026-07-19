import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  Star,
  FileText,
  Settings,
  MessageSquare,
  BarChart3,
} from "lucide-react";

const NAV: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/content", label: "Content", icon: FileText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ email, role }: { email: string | null; role: string | null }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <Link to="/" className="block text-sm font-semibold tracking-tight text-foreground">
          ChitraFrame
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">Admin panel</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          const active = exact
            ? path === to
            : path === to || path.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to as "/admin"}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-xs font-medium text-foreground">{email ?? "—"}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {role ?? "guest"}
        </p>
      </div>
    </aside>
  );
}