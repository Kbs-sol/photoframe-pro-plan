// Server-only Cloudinary helper. Generates signed upload params so the
// browser can PUT the file straight to Cloudinary without the API secret
// ever leaving the server.
import { createHash } from "crypto";

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  uploadPreset: string;
  signature: string;
}

export function getSignedUploadParams(subfolder = "products"): SignedUploadParams {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const baseFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || "chitraframe";
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "chitraframe_signed";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary not configured: set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET");
  }
  const folder = `${baseFolder}/${subfolder}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature = sha1 of alphabetically-sorted params + api_secret
  const toSign = `folder=${folder}&timestamp=${timestamp}&upload_preset=${uploadPreset}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  return { cloudName, apiKey, timestamp, folder, uploadPreset, signature };
}

export async function destroyCloudinaryAsset(publicId: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  });
  return res.ok;
}