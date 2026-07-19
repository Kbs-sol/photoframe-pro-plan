// Microsoft Clarity Data Export API. Free tier: 10 requests / project / day.
// Env: CLARITY_API_TOKEN
// CLI: --days 3 (Clarity max lookback is short on free tier)
import { arg, requireEnv, safe, writeOut } from "./lib";

const days = parseInt(arg("days", "3"), 10);
const token = requireEnv("CLARITY_API_TOKEN");

const report = await safe("clarity", async () => {
  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${days}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Clarity ${res.status}: ${await res.text()}`);
  return { windowDays: days, insights: await res.json() };
});

await writeOut("clarity", report);