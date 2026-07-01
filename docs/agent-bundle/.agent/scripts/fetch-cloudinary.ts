// Cloudinary asset inventory via the Admin API.
// Env: CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud_name>)
// Docs: https://cloudinary.com/documentation/admin_api
const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (!cloudinaryUrl) throw new Error("Missing CLOUDINARY_URL");

const m = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) throw new Error("CLOUDINARY_URL is malformed");
const [, apiKey, apiSecret, cloudName] = m;
const auth = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

async function list(next?: string) {
  const url = new URL(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`,
  );
  url.searchParams.set("max_results", "500");
  if (next) url.searchParams.set("next_cursor", next);
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  return res.json();
}

const all: unknown[] = [];
let cursor: string | undefined;
for (let i = 0; i < 10; i++) {
  const page: { resources?: unknown[]; next_cursor?: string } = await list(cursor);
  all.push(...(page.resources ?? []));
  if (!page.next_cursor) break;
  cursor = page.next_cursor;
}

await Bun.write(
  "out/cloudinary.json",
  JSON.stringify({ assetCount: all.length, assets: all }, null, 2),
);
console.log(`Cloudinary: ${all.length} assets`);
