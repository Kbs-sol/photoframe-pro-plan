// Client-side funnel tracking helper. Fire-and-forget wrapper around
// trackFunnelEventFn (ported from PhotoFramePFS analytics). Captures UTM
// params from the URL once per session and attaches them to every event.
import { trackFunnelEventFn } from "./analytics.functions";

type FunnelEvent =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "begin_checkout"
  | "payment_started"
  | "purchase"
  | "cod_selected";

const SESSION_KEY = "pf_session_id";
const UTM_KEY = "pf_utm";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const cached = sessionStorage.getItem(UTM_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* fall through */
    }
  }
  const qs = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = qs.get(k);
    if (v) utm[k] = v.slice(0, 80);
  }
  if (Object.keys(utm).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  return utm;
}

/** Track a funnel event. Never throws, never blocks the UI. */
export function trackFunnel(
  event: FunnelEvent,
  extra?: { productId?: string; orderId?: string; [k: string]: string | number | boolean | undefined },
): void {
  if (typeof window === "undefined") return;
  const { productId, orderId, ...rest } = extra ?? {};
  const metadata: Record<string, string | number | boolean> = { ...getUtm() };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) metadata[k] = v;
  }
  trackFunnelEventFn({
    data: {
      event_type: event,
      product_id: productId,
      order_id: orderId,
      session_id: getSessionId(),
      metadata,
    },
  }).catch(() => {
    /* analytics must never break the storefront */
  });
}
