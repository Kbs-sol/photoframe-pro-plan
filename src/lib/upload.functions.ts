// Customer photo upload — ported from PhotoFramePFS src/routes/upload.ts.
// Issues short-lived signed Cloudinary upload params so the browser uploads
// the customer's high-res photo directly to Cloudinary (custom_orders folder)
// without the API secret ever reaching the client.
import { createServerFn } from "@tanstack/react-start";

/**
 * Signed upload params for a customer's custom-frame photo.
 * Public endpoint (customers are not signed in), but harmless: it only allows
 * uploading into the dedicated custom_orders folder with the signed preset.
 */
export const getCustomerUploadSignFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { getSignedUploadParams } = await import("./cloudinary.server");
    try {
      const params = getSignedUploadParams("custom_orders");
      return { ok: true as const, ...params };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Upload service not configured",
      };
    }
  },
);
