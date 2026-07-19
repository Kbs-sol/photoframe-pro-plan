// Bundles all out/*.json into a single report.json for the agent to consume.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = "out";
const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "report.json");
const bundle: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  sources: {},
};
for (const f of files) {
  const key = f.replace(/\.json$/, "");
  (bundle.sources as Record<string, unknown>)[key] = JSON.parse(await readFile(join(dir, f), "utf8"));
}
await writeFile(join(dir, "report.json"), JSON.stringify(bundle, null, 2));
// eslint-disable-next-line no-console
console.log(`Packaged ${files.length} sources → out/report.json`);