// Lightweight competitor snapshot. Fetches homepage HTML + extracts titles/prices via regex.
// Not a full scraper — enough to spot new arrivals & price shifts.
const targets = [
  { name: "Postery", url: "https://www.postery.in/" },
  { name: "ArtPix", url: "https://www.artpix3d.com/" },
  { name: "Kraftly", url: "https://www.kraftly.com/" },
];

async function snap(t: { name: string; url: string }) {
  try {
    const res = await fetch(t.url, {
      headers: { "User-Agent": "Mozilla/5.0 ChitraFrameBot/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const description =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
    const prices = Array.from(html.matchAll(/₹\s?([\d,]{2,6})/g))
      .map((m) => Number(m[1].replace(/,/g, "")))
      .filter((n) => n >= 100 && n <= 20000)
      .slice(0, 40);
    return {
      name: t.name,
      url: t.url,
      status: res.status,
      title,
      description,
      prices,
      priceSummary: prices.length
        ? { min: Math.min(...prices), max: Math.max(...prices), median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] }
        : null,
      snappedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { name: t.name, url: t.url, error: (e as Error).message };
  }
}

const snaps = await Promise.all(targets.map(snap));
await Bun.write("out/competitors.json", JSON.stringify(snaps, null, 2));
console.log(`Competitors: ${snaps.length} scraped`);
