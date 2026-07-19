// Client-safe server functions for admin gate.
// Reads the caller's identity from the requireSupabaseAuth middleware,
// then checks membership in the admin_users table.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email as string | undefined) ?? null;
    const { checkAdmin } = await import("./admin.server");
    const check = await checkAdmin(email);
    return {
      isAdmin: check.isAdmin,
      role: check.role,
      email: check.email,
      userId: context.userId,
    };
  });