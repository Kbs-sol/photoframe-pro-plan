// Fetches GA4 core report for the last N days.
// Env: GA4_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID
// CLI: --days 28
import { arg, daysAgoISO, requireEnv, safe, todayISO, writeOut } from "./lib";
import { createSign, createPrivateKey } from "node:crypto";

const days = parseInt(arg("days", "28"), 10);
const sa = JSON.parse(requireEnv("GA4_SERVICE_ACCOUNT_JSON")) as { client_email: string; private_key: string };
const propertyId = requireEnv("GA4_PROPERTY_ID");

function b64url(input: string | Buffer) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signInput = `${header}.${claim}`;
  const sig = createSign("RSA-SHA256").update(signInput).sign(createPrivateKey(sa.private_key));
  const jwt = `${signInput}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`GA4 token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function runReport(accessToken: string, dimensions: string[], metrics: string[]) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: daysAgoISO(days), endDate: todayISO() }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit: 100,
      }),
    },
  );
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  return res.json();
}

const report = await safe("ga4", async () => {
  const t = await token();
  const [source, pages, funnel] = await Promise.all([
    runReport(t, ["sessionSource", "sessionMedium"], ["sessions", "activeUsers", "engagedSessions"]),
    runReport(t, ["pagePath"], ["screenPageViews", "sessions", "userEngagementDuration"]),
    runReport(t, ["eventName"], ["eventCount"]),
  ]);
  return { windowDays: days, sourceMedium: source, topPages: pages, events: funnel };
});

await writeOut("ga4", report);