// Fetch Google Search Console data using a service-account JWT.
// Env: GSC_SERVICE_ACCOUNT_JSON (full JSON string), DAYS, FOCUS_FILTER
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
import { GoogleAuth } from "google-auth-library";

const days = Number(process.env.DAYS ?? "7");
const focus = process.env.FOCUS_FILTER ?? "";
const saJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
if (!saJson) throw new Error("Missing GSC_SERVICE_ACCOUNT_JSON");

const credentials = JSON.parse(saJson);
const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const client = await auth.getClient();
const token = (await client.getAccessToken()).token;

// TODO: replace with the verified site in GSC (e.g. "sc-domain:chitraframe.in" or "https://chitraframe.in/")
const siteUrl = process.env.GSC_SITE_URL ?? "sc-domain:chitraframe.in";

const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

async function query(dims: string[]) {
  const body: Record<string, unknown> = {
    startDate: start,
    endDate: end,
    dimensions: dims,
    rowLimit: 500,
  };
  if (focus) {
    body.dimensionFilterGroups = [
      { filters: [{ dimension: "page", operator: "contains", expression: focus }] },
    ];
  }
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
  return res.json();
}

const [byQuery, byPage, byQueryPage] = await Promise.all([
  query(["query"]),
  query(["page"]),
  query(["query", "page"]),
]);

const out = {
  window: { start, end, days },
  byQuery,
  byPage,
  byQueryPage,
};

await Bun.write("out/gsc.json", JSON.stringify(out, null, 2));
console.log(
  `GSC: ${byQuery.rows?.length ?? 0} queries, ${byPage.rows?.length ?? 0} pages`,
);
