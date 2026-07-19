// Fetches Razorpay orders + payments summary for the last N days.
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// CLI: --days 28
import { arg, requireEnv, safe, writeOut } from "./lib";

const days = parseInt(arg("days", "28"), 10);
const keyId = requireEnv("RAZORPAY_KEY_ID");
const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
const fromTs = Math.floor((Date.now() - days * 86400_000) / 1000);

type Payment = { id: string; amount: number; status: string; created_at: number; method: string; email?: string; notes?: Record<string, unknown> };

const report = await safe("razorpay", async () => {
  // Paginate through payments; free tier max 100 per page.
  const items: Payment[] = [];
  let skip = 0;
  for (let page = 0; page < 20; page++) {
    const url = `https://api.razorpay.com/v1/payments?from=${fromTs}&count=100&skip=${skip}`;
    const res = await fetch(url, { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`Razorpay ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { items: Payment[]; count: number };
    items.push(...json.items);
    if (json.items.length < 100) break;
    skip += 100;
  }

  const captured = items.filter((p) => p.status === "captured");
  const revenue = captured.reduce((s, p) => s + p.amount, 0) / 100; // paise → rupees
  const orders = captured.length;
  const aov = orders ? Math.round(revenue / orders) : 0;
  const refunds = items.filter((p) => p.status === "refunded").length;

  return {
    windowDays: days,
    revenue,
    orders,
    aov,
    refunds,
    refundRate: orders ? +(refunds / orders).toFixed(3) : 0,
    byDay: bucketByDay(captured),
  };
});

function bucketByDay(items: Payment[]) {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const p of items) {
    const day = new Date(p.created_at * 1000).toISOString().slice(0, 10);
    const cur = map.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += p.amount / 100;
    cur.orders += 1;
    map.set(day, cur);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
}

await writeOut("razorpay", report);