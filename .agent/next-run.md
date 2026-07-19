# Next Run — Day 1 Kickoff

_This file is the agent's memory. Read first every session. Overwrite last._

## Human directives
- This is the very first run. Do a baseline audit and set up the loop.
- Do not open PRs on day 1 — only recon.

## Carried over
- (none — first run)

## Hypotheses to test
- H1: Devotional products dominate organic traffic potential in Telangana Jul–Sep window.
- H2: Site currently has 0 blog content — a single well-optimized "Ganesh Chaturthi wall art Hyderabad" post could rank in 4–6 weeks.
- H3: Product SEO titles are generic — rewriting for long-tail (e.g. "Krishna Flute Melody Framed Print for Puja Room") will lift CTR.

## Data to pull next run
- GSC: last 28 days, all pages, all queries (baseline)
- GA4: last 28 days, source/medium, top landing pages, funnel
- Razorpay: last 28 days orders, revenue, AOV
- Supabase: current product count, orders table row count
- Clarity: any available session data
- Competitors: scrape 5 competitor product pages (list in `.agent/prompts/competitor-scan.md`)
- Skip: nothing

## Session plan
1. Read all memory files.
2. Dispatch `agent-fetch-data.yml` with scopes above.
3. Analyze artifact.
4. Report findings to human in chat. **Do NOT open PRs.** Only insights + proposed next-run.md for day 2.
5. Open at most 2 `human-todo` issues if any credentials/setup are missing (GSC service account, GA4 property ID, Razorpay keys).
6. Dispatch `agent-write-next-brief.yml` with day-2 plan.

## Session budget
- Max PRs: 0
- Max blog posts: 0
- Max human-todo issues: 2
- Estimated LLM cost: ₹20