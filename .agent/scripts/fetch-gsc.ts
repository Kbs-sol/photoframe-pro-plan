// Fetches Google Search Console data for the last N days.
// Env: GSC_SERVICE_ACCOUNT_JSON (full JSON), GSC_SITE_URL (e.g. sc-domain:chitraframe.in)
// CLI: --days 28
import { arg, daysAgoISO, requireEnv, safe, todayISO, writeOut } from "./lib";
import { createHmac, createSign, createPrivateKey } from "node:crypto";

const days = parseInt(arg("days", "28"), 10);
const saRaw = requireEnv("GSC_SERVICE_ACCOUNT_JSON");
const siteUrl = requireEnv("GSC_SITE_URL");
const sa = JSON.parse(saRaw) as { client_email: string; private_key: string };

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signInput = `${header}.${claim}`;
  const key = createPrivateKey(sa.private_key);
  const sig = createSign("RSA-SHA256").update(signInput).sign(key);
  const jwt = `${signInput}.${base64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Token exchange ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

function base64url(input: string | Buffer): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const report = await safe("gsc", async () => {
  // Guard so an unused createHmac import doesn't break the build in some bun versions
  void createHmac;
  const token = await getAccessToken();
  const body = {
    startDate: daysAgoISO(days),
    endDate: todayISO(),
    dimensions: ["query", "page"],
    rowLimit: 500,
  };
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
  const rows = j.rows ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { clicks: 0, impressions: 0 },
  );

  return {
    windowDays: days,
    totals,
    rows: rows.slice(0, 200).map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: +(r.ctr * 100).toFixed(2),
      position: +r.position.toFixed(1),
    })),
  };
});

await writeOut("gsc", report);