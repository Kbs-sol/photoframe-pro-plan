// Lightweight competitor homepage + product page scrape.
// No env required.
import { safe, writeOut } from "./lib";

const targets = [
  "https://www.postermuse.com/",
  "https://www.eco-corner.in/",
  "https://www.artisera.com/",
];

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  return re.exec(html)?.[1] ?? null;
}

function extractTitle(html: string): string | null {
  return /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
}

const report = await safe("competitors", async () => {
  const out: Array<{ url: string; ok: boolean; status?: number; title?: string | null; description?: string | null; ogImage?: string | null; error?: string }> = [];
  for (const url of targets) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ChitraFrameAgent/1.0" } });
      const html = await res.text();
      out.push({
        url,
        ok: res.ok,
        status: res.status,
        title: extractTitle(html),
        description: extractMeta(html, "description"),
        ogImage: extractMeta(html, "og:image"),
      });
    } catch (e) {
      out.push({ url, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { scannedAt: new Date().toISOString(), results: out };
});

await writeOut("competitors", report);