// Fetch Google Analytics 4 data via the Data API using a service-account JWT.
// Env: GA4_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID, DAYS
// Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
import { GoogleAuth } from "google-auth-library";

const days = Number(process.env.DAYS ?? "7");
const saJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
const propertyId = process.env.GA4_PROPERTY_ID;
if (!saJson) throw new Error("Missing GA4_SERVICE_ACCOUNT_JSON");
if (!propertyId) throw new Error("Missing GA4_PROPERTY_ID");

const auth = new GoogleAuth({
  credentials: JSON.parse(saJson),
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
});
const client = await auth.getClient();
const token = (await client.getAccessToken()).token;

async function runReport(body: unknown) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  return res.json();
}

const range = { startDate: `${days}daysAgo`, endDate: "today" };

const [sourceMedium, landing, searchTerms, funnel] = await Promise.all([
  runReport({
    dateRanges: [range],
    dimensions: [{ name: "sessionSourceMedium" }],
    metrics: [{ name: "sessions" }, { name: "totalRevenue" }, { name: "conversions" }],
    limit: 50,
  }),
  runReport({
    dateRanges: [range],
    dimensions: [{ name: "landingPage" }],
    metrics: [
      { name: "sessions" },
      { name: "bounceRate" },
      { name: "conversions" },
      { name: "totalRevenue" },
    ],
    limit: 100,
  }),
  runReport({
    dateRanges: [range],
    dimensions: [{ name: "searchTerm" }],
    metrics: [{ name: "eventCount" }],
    limit: 100,
  }),
  runReport({
    dateRanges: [range],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: [
            "view_item",
            "add_to_cart",
            "begin_checkout",
            "add_payment_info",
            "purchase",
          ],
        },
      },
    },
  }),
]);

await Bun.write(
  "out/ga4.json",
  JSON.stringify({ window: range, sourceMedium, landing, searchTerms, funnel }, null, 2),
);
console.log("GA4: OK");
