// Fetch Razorpay orders + payments in the last N days.
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, DAYS
// Docs: https://razorpay.com/docs/api/orders/
const days = Number(process.env.DAYS ?? "7");
const id = process.env.RAZORPAY_KEY_ID;
const secret = process.env.RAZORPAY_KEY_SECRET;
if (!id || !secret) throw new Error("Missing Razorpay keys");

const auth = "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
const from = Math.floor((Date.now() - days * 86400 * 1000) / 1000);

async function page(path: string) {
  const rows: unknown[] = [];
  let skip = 0;
  while (true) {
    const url = `https://api.razorpay.com/v1${path}?from=${from}&count=100&skip=${skip}`;
    const res = await fetch(url, { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`Razorpay ${res.status}: ${await res.text()}`);
    const j: { items?: unknown[] } = await res.json();
    const items = j.items ?? [];
    rows.push(...items);
    if (items.length < 100) break;
    skip += 100;
    if (skip > 2000) break;
  }
  return rows;
}

const [orders, payments] = await Promise.all([page("/orders"), page("/payments")]);

type Payment = { status?: string; amount?: number; method?: string };
const capturedPayments = (payments as Payment[]).filter((p) => p.status === "captured");
const revenuePaise = capturedPayments.reduce((a, p) => a + (p.amount ?? 0), 0);
const cod = capturedPayments.filter((p) => p.method === "cod").length;
const prepaid = capturedPayments.length - cod;

const summary = {
  windowDays: days,
  orderCount: orders.length,
  paymentCount: payments.length,
  capturedCount: capturedPayments.length,
  revenueINR: revenuePaise / 100,
  aovINR: capturedPayments.length ? revenuePaise / capturedPayments.length / 100 : 0,
  codVsPrepaid: { cod, prepaid },
};

await Bun.write(
  "out/razorpay.json",
  JSON.stringify({ summary, orders, payments }, null, 2),
);
console.log("Razorpay:", summary);
