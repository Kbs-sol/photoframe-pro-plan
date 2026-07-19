// Read-only product + order counts via Supabase REST (uses service role — read only).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { requireEnv, safe, writeOut } from "./lib";

const url = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

async function count(table: string): Promise<number> {
  const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
  const range = res.headers.get("content-range") ?? "0/0";
  return parseInt(range.split("/")[1] ?? "0", 10);
}

const report = await safe("supabase", async () => {
  // These tables may not all exist yet — swallow errors per table.
  const tables = ["orders", "custom_orders", "assistant_logs"];
  const counts: Record<string, number | null> = {};
  for (const t of tables) {
    try {
      counts[t] = await count(t);
    } catch {
      counts[t] = null;
    }
  }
  return { tableCounts: counts };
});

await writeOut("supabase", report);