# SEO Audit Sub-Prompt

Use this when the session directive is SEO-focused.

Given the GSC + GA4 data in the artifact:

1. **Underperforming pages**: List every page with impressions >100 and CTR <2% in the last 14 days. For each, propose a new `<title>` (≤60 chars) and `<meta description>` (≤160 chars) that respects the brand voice in `instructions.md`. Include the current values and the proposed values side-by-side.
2. **Almost-there pages**: List every page ranking positions 11–20 with volume >50. Propose one specific content addition (FAQ block, expanded intro, internal link cluster) that would push it to page 1.
3. **Content gaps**: List every query with impressions >30 that has no matching page. Propose a page (product or blog) to fill it.
4. **Internal linking**: For each product page in categories from `focus.md`, propose 2 outbound internal links (to related products + 1 blog).
5. **Structured data**: Flag any product page missing JSON-LD `Product` schema.

Output each finding as a candidate PR with a filled-out Agent Decision block.
