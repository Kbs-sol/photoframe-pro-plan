// Sales-funnel analytics + lead capture — ported from PhotoFramePFS
// src/routes/analytics.ts. Public (unauthenticated) endpoints, so inputs
// are strictly validated and inserts are fire-and-forget best-effort.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EVENT_TYPES = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "payment_started",
  "purchase",
  "cod_selected",
] as const;

const funnelInput = z.object({
  event_type: z.enum(EVENT_TYPES),
  product_id: z.string().max(120).optional(),
  order_id: z.string().max(60).optional(),
  session_id: z.string().max(80).optional(),
  metadata: z
    .object({
      utm_source: z.string().max(80).optional(),
      utm_medium: z.string().max(80).optional(),
      utm_campaign: z.string().max(80).optional(),
    })
    .catchall(z.union([z.string().max(300), z.number(), z.boolean()]))
    .optional(),
});

/** Record a sales-funnel event (page view → purchase). Never throws to client. */
export const trackFunnelEventFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => funnelInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { hasSupabase, getSupabase } = await import("./supabase.server");
      if (!hasSupabase()) return { success: true as const };
      const sb = getSupabase();
      await sb.from("sales_funnel_events").insert({
        event_type: data.event_type,
        product_id: data.product_id || null,
        order_id: data.order_id || null,
        session_id: data.session_id || null,
        utm_source: data.metadata?.utm_source || null,
        utm_medium: data.metadata?.utm_medium || null,
        utm_campaign: data.metadata?.utm_campaign || null,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
      });
      return { success: true as const };
    } catch (e) {
      console.error("funnel event failed", e);
      return { success: false as const };
    }
  });

const leadInput = z
  .object({
    email: z.string().email().max(200).optional(),
    phone: z.string().regex(/^[0-9+\-\s]{8,15}$/).optional(),
    name: z.string().max(120).optional(),
    source: z.enum(["popup", "checkout_abandon", "footer", "exit_intent"]).default("popup"),
    utm_source: z.string().max(80).optional(),
    utm_medium: z.string().max(80).optional(),
    utm_campaign: z.string().max(80).optional(),
  })
  .refine((d) => d.email || d.phone, { message: "email or phone required" });

/** Capture a marketing lead (newsletter popup, abandoned checkout, etc.). */
export const captureLeadFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { hasSupabase, getSupabase } = await import("./supabase.server");
      if (!hasSupabase()) return { success: true as const };
      const sb = getSupabase();
      await sb.from("leads").insert({
        email: data.email?.toLowerCase() || null,
        phone: data.phone || null,
        name: data.name || null,
        source: data.source,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
      });
      return { success: true as const };
    } catch (e) {
      console.error("lead capture failed", e);
      return { success: false as const };
    }
  });
