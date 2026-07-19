// Cloudinary Admin API — asset usage / bandwidth.
// Env: CLOUDINARY_URL (cloudinary://key:secret@cloud_name)
import { requireEnv, safe, writeOut } from "./lib";

const cUrl = requireEnv("CLOUDINARY_URL");
const parsed = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(cUrl);
if (!parsed) throw new Error("Invalid CLOUDINARY_URL");
const [, apiKey, apiSecret, cloudName] = parsed;
const auth = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

const report = await safe("cloudinary", async () => {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  return await res.json();
});

await writeOut("cloudinary", report);