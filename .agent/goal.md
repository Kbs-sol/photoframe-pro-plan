# Goal: ₹15,000 organic sales in 90 days

_Goal engine reads this every session. Autonomous strategy pivots based on pace._

## Target
- **Amount:** ₹15,000
- **Window:** 90 days from launch date
- **Channel:** Organic only (no paid ads counted)
- **Launch date:** _Set by human on day 1 — replace this line with actual date, e.g._ `2026-07-01`

## Pace milestones
| Phase | Days | Target ₹ | Cumulative ₹ |
|---|---|---|---|
| Foundation | 1–30 | 2,000 | 2,000 |
| Traction | 31–60 | 5,000 | 7,000 |
| Compound | 61–90 | 8,000 | 15,000 |

## Current status
_Auto-updated by `.agent/scripts/compute-pace.ts` on each run._

```
Days elapsed: 0
Revenue to date: ₹0
Orders: 0
AOV: ₹0
Pace: not-started
Expected shortfall/surplus vs plan: ₹0
```

## Autonomous strategic pivots
- **Behind pace by >30%:** shift session budget to high-CVR SKUs, kill low-performers from homepage, propose bundles, open human-todo for Google Merchant Center / GBP.
- **Behind pace by >50%:** open human-todo issue titled `[HUMAN] Goal at risk — decision needed` with 3 options (extend timeline / lower target / inject cash for ads).
- **Ahead of pace by >30%:** invest in top-of-funnel content (blog posts, SEO-optimized landing pages for adjacent keywords, more SKUs).

## Do not do
- Do not lower this target autonomously.
- Do not count non-organic revenue toward this goal.
- Do not propose ad spend as a solution without an approved `human-todo`.