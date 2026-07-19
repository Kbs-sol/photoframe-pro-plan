# SEO Audit Prompt

When `next-run.md` says "run SEO audit":

1. From GSC artifact, list every URL with position between 6 and 20 (the "almost ranking" zone) — these are the highest-leverage rewrites.
2. For each, propose: new title (≤60 chars), new meta description (≤160 chars, includes primary keyword + benefit + CTA), 1 internal-link opportunity.
3. Include the current query the URL wins impressions on. Do not change titles that already win #1–#3 unless CTR is <2%.
4. Group into one PR per 3–5 products (never 1 PR per product — noise).
5. Expected revenue impact per PR: `(avg monthly impressions × CTR delta × site CVR × AOV × 3 months) / 100`.