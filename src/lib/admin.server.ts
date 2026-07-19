// Admin authorization helper — checks the signed-in user's email against
// the `admin_users` table using the service-role client (bypasses RLS).
// Server-only. Do not import from client code.

export type AdminRole = "owner" | "admin" | "staff";

export interface AdminCheck {
  isAdmin: boolean;
  role: AdminRole | null;
  email: string | null;
}

export async function checkAdmin(email: string | null | undefined): Promise<AdminCheck> {
  if (!email) return { isAdmin: false, role: null, email: null };
  const cleanEmail = email.trim().toLowerCase();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // `admin_users` lives in the user's own Supabase project — not in the
  // auto-generated Database types shipped with this repo. Cast to bypass.
  const { data, error } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { role?: string } | null; error: unknown }>;
        };
      };
    };
  })
    .from("admin_users")
    .select("role")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (error || !data) return { isAdmin: false, role: null, email: cleanEmail };
  return {
    isAdmin: true,
    role: (data.role as AdminRole) ?? "admin",
    email: cleanEmail,
  };
}