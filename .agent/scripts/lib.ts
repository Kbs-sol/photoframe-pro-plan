// Shared helpers for all fetch scripts. bun runtime.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type SourceReport<T = unknown> = {
  source: string;
  fetchedAt: string;
  ok: boolean;
  error?: string;
  data: T | null;
};

export async function writeOut<T>(name: string, report: SourceReport<T>) {
  const dir = join(process.cwd(), "out");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${name}.json`), JSON.stringify(report, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[${name}] ok=${report.ok}${report.error ? ` error=${report.error}` : ""}`);
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name];
}

export function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(`--${flag}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function safe<T>(
  source: string,
  fn: () => Promise<T>,
): Promise<SourceReport<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    const data = await fn();
    return { source, fetchedAt, ok: true, data };
  } catch (err) {
    return {
      source,
      fetchedAt,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      data: null,
    };
  }
}