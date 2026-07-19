// Goal engine. Reads out/razorpay.json + .agent/goal.md, prints pace summary.
import { readFile, writeFile } from "node:fs/promises";

type RazorpayReport = { data: { revenue: number; orders: number; aov: number } | null; ok: boolean };

const goalTotal = 15000;
const windowDays = 90;

function extractLaunchDate(goalMd: string): Date | null {
  const m = /launch date[^\n]*?(\d{4}-\d{2}-\d{2})/i.exec(goalMd);
  return m ? new Date(m[1]) : null;
}

const goalMd = await readFile(".agent/goal.md", "utf8");
const launchDate = extractLaunchDate(goalMd);
const raz = JSON.parse(await readFile("out/razorpay.json", "utf8")) as RazorpayReport;
const revenue = raz.ok && raz.data ? raz.data.revenue : 0;
const orders = raz.ok && raz.data ? raz.data.orders : 0;
const aov = raz.ok && raz.data ? raz.data.aov : 0;

const now = new Date();
const daysElapsed = launchDate
  ? Math.max(0, Math.floor((now.getTime() - launchDate.getTime()) / 86400_000))
  : 0;
const expectedByNow = launchDate
  ? Math.round((Math.min(daysElapsed, windowDays) / windowDays) * goalTotal)
  : 0;
const delta = revenue - expectedByNow;
const pctDelta = expectedByNow > 0 ? Math.round((delta / expectedByNow) * 100) : 0;

let pace: "not-started" | "on-track" | "behind" | "ahead" | "at-risk";
if (!launchDate) pace = "not-started";
else if (pctDelta > 30) pace = "ahead";
else if (pctDelta < -50) pace = "at-risk";
else if (pctDelta < -30) pace = "behind";
else pace = "on-track";

const summary = {
  launchDate: launchDate?.toISOString().slice(0, 10) ?? null,
  daysElapsed,
  windowDays,
  revenue,
  goalTotal,
  expectedByNow,
  deltaInr: delta,
  pctDelta,
  pace,
  orders,
  aov,
  projectedEndOfWindow: daysElapsed > 0 ? Math.round((revenue / daysElapsed) * windowDays) : 0,
};

await writeFile("out/pace.json", JSON.stringify(summary, null, 2));
// eslint-disable-next-line no-console
console.log(JSON.stringify(summary, null, 2));