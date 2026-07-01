// Orchestrates all fetchers based on SOURCES env, then bundles a single report.json.
// Env: SOURCES (comma list), everything the child scripts need
const sources = (process.env.SOURCES ?? "gsc,ga4,razorpay,supabase,pr-feedback")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const scripts: Record<string, string> = {
  gsc: ".agent/scripts/fetch-gsc.ts",
  ga4: ".agent/scripts/fetch-ga4.ts",
  razorpay: ".agent/scripts/fetch-razorpay.ts",
  supabase: ".agent/scripts/fetch-supabase.ts",
  cloudinary: ".agent/scripts/fetch-cloudinary.ts",
  competitors: ".agent/scripts/scrape-competitors.ts",
  "pr-feedback": ".agent/scripts/harvest-pr-feedback.ts",
};

const results: Record<string, { ok: boolean; error?: string }> = {};

for (const src of sources) {
  const path = scripts[src];
  if (!path) {
    results[src] = { ok: false, error: "unknown source" };
    continue;
  }
  console.log(`\n→ ${src}`);
  const proc = Bun.spawn(["bun", path], {
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  const code = await proc.exited;
  results[src] = code === 0 ? { ok: true } : { ok: false, error: `exit ${code}` };
}

// Compose top-level report.json summarising what ran
const report = {
  generatedAt: new Date().toISOString(),
  windowDays: Number(process.env.DAYS ?? "7"),
  focusFilter: process.env.FOCUS_FILTER ?? null,
  sources: results,
  files: sources.map((s) => `${s}.json`),
};

await Bun.write("out/report.json", JSON.stringify(report, null, 2));
console.log("\n✓ report.json written");
console.log(JSON.stringify(results, null, 2));
